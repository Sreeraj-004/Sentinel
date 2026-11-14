
import time
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Server, Script, HealthCheckLog

from models import Server, ServerService, Script, HealthCheckLog


EXECUTION_DELAY_SECONDS = 5
LOG_DELAY_SECONDS = 0.7
HEALTHY_THRESHOLD = 75

USE_CASE_MAPPING = {
    "CPU": {
        "script_name": "cpu_diagnostics.ps1",
        "source": "CPU Monitor",
    },
    "MEMORY": {
        "script_name": "memory_diagnostics.ps1",
        "source": "Memory Monitor",
    },
    "DISK": {
        "script_name": "disk_cleanup.ps1",
        "source": "Disk Monitor",
    },
}


def create_log(
    db: Session,
    server_id: int,
    level: str,
    source: str,
    message: str,
):
    log = HealthCheckLog(
        server_id=server_id,
        level=level,
        source=source,
        message=message,
        created_at=datetime.now(timezone.utc),
    )

    db.add(log)


def write_log(
    db: Session,
    server_id: int,
    level: str,
    source: str,
    message: str,
    delay: bool = True,
):
    create_log(db, server_id, level, source, message)
    db.commit()

    if delay:
        time.sleep(LOG_DELAY_SECONDS)


def get_resource_value(server: Server, use_case: str):
    if use_case == "CPU":
        return server.cpu_percent

    if use_case == "MEMORY":
        if server.memory_total_gb <= 0:
            return None

        return (
            (server.memory_total_gb - server.memory_available_gb)
            / server.memory_total_gb
        ) * 100

    if use_case == "DISK":
        if server.disk_total_gb <= 0:
            return None

        return (
            (server.disk_total_gb - server.disk_available_gb)
            / server.disk_total_gb
        ) * 100

    return None


def execute_use_case(
    db: Session,
    server_id: int,
    use_case: str,
):
    normalized_use_case = use_case.strip().upper()

    mapping = USE_CASE_MAPPING.get(normalized_use_case)

    if mapping is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported use case. Supported values: CPU, Memory, Disk.",
        )

    server = db.get(Server, server_id)

    if server is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target server not found.",
        )

    script_name = mapping["script_name"]
    source = mapping["source"]

    script = db.scalar(
        select(Script).where(Script.name == script_name)
    )

    if script is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_name} was not found in the catalogue.",
        )

    previous_value = get_resource_value(server, normalized_use_case)

    if previous_value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to determine {normalized_use_case} utilization.",
        )

    try:
        write_log(
            db,
            server.id,
            "INFO",
            "Use Case Engine",
            f"Initiating {normalized_use_case} use case on {server.hostname}.",
        )

        write_log(
            db,
            server.id,
            "INFO",
            "Script Mapper",
            f"Matched {normalized_use_case} with {script_name}.",
        )

        write_log(
            db,
            server.id,
            "INFO",
            "Script Execution",
            f"Initiating {script_name} on {server.hostname}.",
        )

        # Simulate the use-case action by updating database metrics.
        if normalized_use_case == "CPU":
            server.cpu_percent = 55.0

        elif normalized_use_case == "MEMORY":
            server.memory_available_gb = (
                server.memory_total_gb * 0.45
            )

        elif normalized_use_case == "DISK":
            server.disk_available_gb = (
                server.disk_total_gb * 0.45
            )

        server.updated_at = datetime.now(timezone.utc)

        # Persist the metric update before verification.
        db.commit()
        db.refresh(server)

        current_value = get_resource_value(
            server,
            normalized_use_case,
        )

        # Simulate execution and verification.
        time.sleep(EXECUTION_DELAY_SECONDS)

        if current_value is not None and current_value <= HEALTHY_THRESHOLD:
            write_log(
                db,
                server.id,
                "SUCCESS",
                "Script Execution",
                f"{script_name} executed successfully on {server.hostname}.",
            )

            write_log(
                db,
                server.id,
                "SUCCESS",
                "Resource Monitor",
                f"{normalized_use_case} utilization reduced from "
                f"{previous_value:.1f}% to {current_value:.1f}%.",
                delay=False,
            )

            return {
                "success": True,
                "server_id": server.id,
                "hostname": server.hostname,
                "use_case": normalized_use_case,
                "script": script_name,
                "previous_value": round(previous_value, 1),
                "current_value": round(current_value, 1),
                "message": "Use case executed successfully.",
            }

        write_log(
            db,
            server.id,
            "ALERT",
            "Script Execution",
            f"{script_name} completed, but {normalized_use_case} "
            f"utilization remains above the healthy threshold.",
            delay=False,
        )

        return {
            "success": False,
            "server_id": server.id,
            "hostname": server.hostname,
            "use_case": normalized_use_case,
            "script": script_name,
            "previous_value": round(previous_value, 1),
            "current_value": (
                round(current_value, 1)
                if current_value is not None else None
            ),
            "message": "Use case completed but resource remains elevated.",
        }

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        create_log(
            db,
            server.id,
            "CRITICAL",
            "Script Execution",
            f"Use case {normalized_use_case} failed: {str(error)}",
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Use-case execution failed.",
        ) from error


def execute_service_recovery(
    db: Session,
    server_id: int,
    service_id: int,
):
    server = db.get(Server, server_id)
    service = db.get(ServerService, service_id)

    if server is None or service is None or service.server_id != server_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server or service not found.",
        )

    if (service.status or "").strip().lower() == "running":
        return {
            "success": True,
            "server_id": server.id,
            "hostname": server.hostname,
            "service": service.service_name,
            "message": "Service is already running.",
        }

    try:
        write_log(
            db,
            server.id,
            "INFO",
            "Service Recovery",
            f"Initiating recovery of {service.service_name} "
            f"on {server.hostname}.",
        )

        write_log(
            db,
            server.id,
            "INFO",
            "Service Recovery",
            f"Attempting to start service {service.service_name}.",
        )

        # Simulate starting the service.
        service.status = "Running"
        db.commit()
        db.refresh(service)

        time.sleep(EXECUTION_DELAY_SECONDS)

        if (service.status or "").strip().lower() == "running":
            write_log(
                db,
                server.id,
                "SUCCESS",
                "Service Recovery",
                f"Service {service.service_name} successfully started "
                f"on {server.hostname}.",
            )

            return {
                "success": True,
                "server_id": server.id,
                "hostname": server.hostname,
                "service": service.service_name,
                "previous_status": "Stopped",
                "current_status": service.status,
                "message": "Service recovery completed successfully.",
            }

        write_log(
            db,
            server.id,
            "ALERT",
            "Service Recovery",
            f"Unable to start service {service.service_name} "
            f"on {server.hostname}.",
            delay=False,
        )

        return {
            "success": False,
            "server_id": server.id,
            "hostname": server.hostname,
            "service": service.service_name,
            "current_status": service.status,
            "message": "Service recovery failed.",
        }

    except Exception as error:
        db.rollback()

        create_log(
            db,
            server.id,
            "CRITICAL",
            "Service Recovery",
            f"Service recovery failed for {service.service_name}: {str(error)}",
        )
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service recovery failed.",
        ) from error
