
import time

from sqlalchemy.orm import Session, selectinload

from models import Server
from use_cases import (
    create_log,
    execute_use_case,
    execute_service_recovery,
)
from action_requests import (
    create_warning_request,
    close_warning_episode,
)


HEALTHY_THRESHOLD = 75
ELEVATED_THRESHOLD = 85
HIGH_THRESHOLD = 90
CRITICAL_THRESHOLD = 95

LOG_DELAY_SECONDS = 0.7


def write_log(
    db: Session,
    server_id: int,
    level: str,
    source: str,
    message: str,
):
    create_log(db, server_id, level, source, message)
    db.commit()
    time.sleep(LOG_DELAY_SECONDS)


def get_status(value: float) -> str:
    if value >= CRITICAL_THRESHOLD:
        return "CRITICAL"
    if value >= HIGH_THRESHOLD:
        return "HIGH"
    if value >= ELEVATED_THRESHOLD:
        return "ELEVATED"
    if value > HEALTHY_THRESHOLD:
        return "WARNING"

    return "HEALTHY"


def calculate_metrics(server: Server):
    memory = (
        (server.memory_total_gb - server.memory_available_gb)
        / server.memory_total_gb * 100
        if server.memory_total_gb > 0 else None
    )

    disk = (
        (server.disk_total_gb - server.disk_available_gb)
        / server.disk_total_gb * 100
        if server.disk_total_gb > 0 else None
    )

    return {
        "CPU": server.cpu_percent,
        "Memory": memory,
        "Disk": disk,
    }


def run_health_check(db: Session):
    servers = (
        db.query(Server)
        .options(selectinload(Server.services))
        .order_by(Server.id)
        .all()
    )

    summary = {
        "servers_checked": len(servers),
        "resources_checked": 0,
        "remediation_attempts": 0,
        "successful_remediations": 0,
        "failed_remediations": 0,
        "service_recovery_attempts": 0,
        "successful_service_recoveries": 0,
        "failed_service_recoveries": 0,
    }

    log_levels = {
        "HEALTHY": "SUCCESS",
        "WARNING": "WARNING",
        "ELEVATED": "WARNING",
        "HIGH": "ALERT",
        "CRITICAL": "CRITICAL",
    }

    for server in servers:
        write_log(
            db,
            server.id,
            "INFO",
            "Sentinel Monitor",
            f"Initiating health check for {server.hostname}.",
        )

        metrics = calculate_metrics(server)

        # Resource monitoring and recovery
        for resource, value in metrics.items():
            summary["resources_checked"] += 1

            if value is None:
                write_log(
                    db,
                    server.id,
                    "WARNING",
                    "Resource Monitor",
                    f"{resource} utilization cannot be determined.",
                )
                continue

            resource_status = get_status(value)

            write_log(
                db,
                server.id,
                log_levels[resource_status],
                "Resource Monitor",
                f"{resource} utilization is {resource_status.lower()} "
                f"({value:.1f}%).",
            )

            if resource_status == "WARNING":
                request = create_warning_request(
                    db=db,
                    server=server,
                    resource=resource,
                    value=value,
                )

                if request.status == "PENDING":
                    write_log(
                        db,
                        server.id,
                        "INFO",
                        "Sentinel Bot",
                        f"Action request #{request.id} created for "
                        f"{resource} utilization on {server.hostname}.",
                    )

                continue

            if resource_status == "HEALTHY":
                close_warning_episode(
                    db=db,
                    server_id=server.id,
                    resource=resource,
                )
                continue

            if resource_status not in {"ELEVATED", "HIGH", "CRITICAL"}:
                continue

            write_log(
                db,
                server.id,
                "INFO",
                "Sentinel Automation",
                f"Initiating {resource} use case for {server.hostname}.",
            )

            summary["remediation_attempts"] += 1

            try:
                result = execute_use_case(
                    db=db,
                    server_id=server.id,
                    use_case=resource,
                )

                if result["success"]:
                    summary["successful_remediations"] += 1
                else:
                    summary["failed_remediations"] += 1

            except Exception as error:
                summary["failed_remediations"] += 1

                if hasattr(error, "status_code"):
                    continue

                write_log(
                    db,
                    server.id,
                    "CRITICAL",
                    "Sentinel Automation",
                    f"Failed to initiate {resource} use case: {str(error)}",
                )

        # Service monitoring and recovery
        if not server.services:
            write_log(
                db,
                server.id,
                "WARNING",
                "Service Monitor",
                "No services are registered for this server.",
            )
            continue

        for service in server.services:
            service_status = (service.status or "").strip().lower()

            if service_status == "stopped":
                write_log(
                    db,
                    server.id,
                    "ALERT",
                    "Service Monitor",
                    f"Service {service.service_name} is stopped "
                    f"on {server.hostname}.",
                )

                write_log(
                    db,
                    server.id,
                    "INFO",
                    "Sentinel Automation",
                    f"Initiating recovery for {service.service_name} "
                    f"on {server.hostname}.",
                )

                summary["service_recovery_attempts"] += 1

                try:
                    result = execute_service_recovery(
                        db=db,
                        server_id=server.id,
                        service_id=service.id,
                    )

                    if result["success"]:
                        summary["successful_service_recoveries"] += 1
                    else:
                        summary["failed_service_recoveries"] += 1

                except Exception as error:
                    summary["failed_service_recoveries"] += 1

                    if not hasattr(error, "status_code"):
                        write_log(
                            db,
                            server.id,
                            "CRITICAL",
                            "Sentinel Automation",
                            f"Failed to recover {service.service_name}: "
                            f"{str(error)}",
                        )

            elif service_status == "running":
                write_log(
                    db,
                    server.id,
                    "SUCCESS",
                    "Service Monitor",
                    f"Service {service.service_name} is running.",
                )

            else:
                write_log(
                    db,
                    server.id,
                    "WARNING",
                    "Service Monitor",
                    f"Service {service.service_name} has an unknown "
                    f"status: {service.status}.",
                )

    return summary
