
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.exc import NoResultFound
from datetime import datetime, timezone

from database import Base, SessionLocal, engine, get_db
from models import Server, ServerService, Script
from schemas import (
    ServerCreate,
    ServerResponse,
    ScriptCreate,
    ScriptUpdate,
    ScriptResponse,
)
from seed import seed_servers
from script_seed import seed_scripts
from schemas import UseCaseExecuteRequest
from use_cases import execute_use_case
from action_requests import ActionRequest

from monitoring import run_health_check
from models import HealthCheckLog


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_servers(db)
        seed_scripts(db)

    yield


app = FastAPI(
    title="Sentinel API",
    description="Infrastructure health and server inventory API.",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Sentinel",
    }


# --------------------------------------------------
# Server APIs
# --------------------------------------------------

@app.get("/api/servers", response_model=list[ServerResponse])
def list_servers(db: Session = Depends(get_db)):
    statement = (
        select(Server)
        .options(selectinload(Server.services))
        .order_by(Server.id)
    )

    return db.scalars(statement).all()


@app.get("/api/servers/{server_id}", response_model=ServerResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    statement = (
        select(Server)
        .options(selectinload(Server.services))
        .where(Server.id == server_id)
    )

    server = db.scalar(statement)

    if server is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found.",
        )

    return server


@app.post(
    "/api/servers",
    response_model=ServerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_server(
    payload: ServerCreate,
    db: Session = Depends(get_db),
):
    server = Server(
        hostname=payload.hostname,
        ip_address=payload.ip_address,
        cpu_percent=payload.cpu_percent,
        memory_total_gb=payload.memory_total_gb,
        memory_available_gb=payload.memory_available_gb,
        disk_total_gb=payload.disk_total_gb,
        disk_available_gb=payload.disk_available_gb,
    )

    server.services = [
        ServerService(
            service_name=service.service_name,
            status=service.status,
        )
        for service in payload.services
    ]

    db.add(server)

    try:
        db.commit()
        db.refresh(server)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hostname or IP address already exists.",
        )

    return server


# --------------------------------------------------
# Script APIs
# --------------------------------------------------

@app.get("/api/scripts", response_model=list[ScriptResponse])
def list_scripts(db: Session = Depends(get_db)):
    statement = select(Script).order_by(Script.name)

    return db.scalars(statement).all()


@app.get("/api/scripts/{script_id}", response_model=ScriptResponse)
def get_script(script_id: int, db: Session = Depends(get_db)):
    script = db.get(Script, script_id)

    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found.",
        )

    return script


@app.post(
    "/api/scripts",
    response_model=ScriptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_script(
    payload: ScriptCreate,
    db: Session = Depends(get_db),
):
    script = Script(**payload.model_dump())

    db.add(script)

    try:
        db.commit()
        db.refresh(script)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A script with this name already exists.",
        )

    return script


@app.put("/api/scripts/{script_id}", response_model=ScriptResponse)
def update_script(
    script_id: int,
    payload: ScriptUpdate,
    db: Session = Depends(get_db),
):
    script = db.get(Script, script_id)

    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found.",
        )

    for field, value in payload.model_dump().items():
        setattr(script, field, value)

    try:
        db.commit()
        db.refresh(script)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A script with this name already exists.",
        )

    return script


@app.delete(
    "/api/scripts/{script_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_script(
    script_id: int,
    db: Session = Depends(get_db),
):
    script = db.get(Script, script_id)

    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found.",
        )

    db.delete(script)
    db.commit()


@app.post("/api/monitoring/run")
def trigger_health_check(db: Session = Depends(get_db)):
    summary = run_health_check(db)

    return {
        "message": "Health check completed.",
        **summary,
    }


@app.post("/api/use-cases/execute")
def trigger_use_case(
    payload: UseCaseExecuteRequest,
    db: Session = Depends(get_db),
):
    action_request = None

    if payload.action_request_id is not None:
        action_request = db.get(
            ActionRequest,
            payload.action_request_id,
        )

        if action_request is None:
            raise HTTPException(
                status_code=404,
                detail="Action request not found.",
            )

        if (
            action_request.server_id != payload.server_id
            or action_request.resource.upper() != payload.use_case.upper()
        ):
            raise HTTPException(
                status_code=400,
                detail="Action request does not match the requested use case.",
            )

        if action_request.status != "PENDING":
            raise HTTPException(
                status_code=409,
                detail="This action request is no longer pending.",
            )

        action_request.status = "EXECUTING"
        db.commit()

    try:
        result = execute_use_case(
            db=db,
            server_id=payload.server_id,
            use_case=payload.use_case,
        )

        if action_request:
            action_request.status = (
                "COMPLETED" if result["success"] else "FAILED"
            )
            action_request.updated_at = datetime.now(timezone.utc)
            db.commit()

        return {
            **result,
            "action_request_id": payload.action_request_id,
        }

    except Exception:
        if action_request:
            action_request.status = "FAILED"
            action_request.updated_at = datetime.now(timezone.utc)
            db.commit()

        raise


@app.get("/api/servers/{server_id}/logs")
def get_server_logs(
    server_id: int,
    db: Session = Depends(get_db),
):
    logs = (
        db.query(HealthCheckLog)
        .filter(HealthCheckLog.server_id == server_id)
        .order_by(HealthCheckLog.created_at.desc())
        .limit(200)
        .all()
    )

    return [
        {
            "id": log.id,
            "time": log.created_at.strftime("%H:%M:%S"),
            "level": log.level,
            "source": log.source,
            "message": log.message,
        }
        for log in reversed(logs)
    ]


@app.post("/api/servers/{server_id}/simulate-elevated")
def simulate_elevated_utilization(
    server_id: int,
    db: Session = Depends(get_db),
):
    server = db.query(Server).filter(
        Server.id == server_id
    ).first()

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found.",
        )

    try:
        target_utilization = 87.0

        # Set CPU utilization to 87%.
        server.cpu_percent = target_utilization

        # Set memory utilization to 87%.
        server.memory_available_gb = (
            server.memory_total_gb * 0.13
        )

        # Set disk utilization to 87%.
        server.disk_available_gb = (
            server.disk_total_gb * 0.13
        )

        server.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(server)

        return {
            "message": "Server resources updated to ELEVATED state.",
            "server_id": server.id,
            "hostname": server.hostname,
            "target_utilization": target_utilization,
            "resources_updated": [
                "CPU",
                "Memory",
                "Disk",
            ],
        }

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update server utilization: {str(error)}",
        )


@app.post("/api/servers/{server_id}/simulate-warning")
def simulate_warning_utilization(
    server_id: int,
    db: Session = Depends(get_db),
):
    server = db.query(Server).filter(
        Server.id == server_id
    ).first()

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found.",
        )

    try:
        target_utilization = 80.0

        # Set CPU utilization to 80%.
        server.cpu_percent = target_utilization

        # Set memory utilization to 80%.
        server.memory_available_gb = (
            server.memory_total_gb * 0.20
        )

        # Set disk utilization to 80%.
        server.disk_available_gb = (
            server.disk_total_gb * 0.20
        )

        server.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(server)

        return {
            "message": "Server resources updated to WARNING state.",
            "server_id": server.id,
            "hostname": server.hostname,
            "target_utilization": target_utilization,
            "resources_updated": [
                "CPU",
                "Memory",
                "Disk",
            ],
        }

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update server utilization: {str(error)}",
        )


@app.get("/api/action-requests")
def get_action_requests(
    db: Session = Depends(get_db),
):
    requests = (
        db.query(ActionRequest)
        .order_by(ActionRequest.created_at.desc())
        .limit(100)
        .all()
    )

    results = []

    for request in requests:
        server = db.get(Server, request.server_id)

        results.append({
            "id": request.id,
            "server_id": request.server_id,
            "hostname": server.hostname if server else "Unknown",
            "resource": request.resource,
            "observed_value": request.observed_value,
            "issue": request.issue,
            "action_title": request.action_title,
            "action_details": request.action_details,
            "status": request.status,
            "created_at": request.created_at.isoformat(),
        })

    return results



@app.post("/api/action-requests/{request_id}/reject")
def reject_action_request(
    request_id: int,
    db: Session = Depends(get_db),
):
    action_request = db.get(ActionRequest, request_id)

    if action_request is None:
        raise HTTPException(
            status_code=404,
            detail="Action request not found.",
        )

    if action_request.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This action request is no longer pending.",
        )

    action_request.status = "REJECTED"
    action_request.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(action_request)

    return {
        "success": True,
        "request_id": action_request.id,
        "status": action_request.status,
        "message": "Action request rejected.",
    }
