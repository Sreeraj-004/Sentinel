
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import ActionRequest, Server


def create_warning_request(
    db: Session,
    server: Server,
    resource: str,
    value: float,
):
    active_key = f"{server.id}:{resource}"

    existing = (
        db.query(ActionRequest)
        .filter(ActionRequest.active_key == active_key)
        .first()
    )

    if existing:
        return existing

    request = ActionRequest(
        server_id=server.id,
        resource=resource,
        observed_value=round(value, 1),
        issue=(
            f"{resource} utilization is above the healthy threshold "
            f"on {server.hostname} ({value:.1f}%)."
        ),
        action_title=f"Optimize {resource} utilization",
        action_details=(
            f"Run the approved {resource} diagnostic and optimization "
            f"use case on {server.hostname} to reduce utilization."
        ),
        status="PENDING",
        active_key=active_key,
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def close_warning_episode(
    db: Session,
    server_id: int,
    resource: str,
):
    active_key = f"{server_id}:{resource}"

    request = (
        db.query(ActionRequest)
        .filter(ActionRequest.active_key == active_key)
        .first()
    )

    if request:
        request.active_key = None

        if request.status == "PENDING":
            request.status = "CLOSED"

        request.updated_at = datetime.now(timezone.utc)
        db.commit()
