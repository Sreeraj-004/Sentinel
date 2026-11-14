from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Server, ServerService


SERVER_DATA = [
    {
        "hostname": "SNTL-WEB-01",
        "ip_address": "10.10.1.11",
        "cpu": 32,
        "memory_total": 16,
        "memory_available": 7.5,
        "disk_total": 250,
        "disk_available": 120,
        "services": {
            "W3SVC": "Running",
            "SentinelAgent": "Running",
            "Spooler": "Running",
        },
    },
    {
        "hostname": "SNTL-WEB-02",
        "ip_address": "10.10.1.12",
        "cpu": 48,
        "memory_total": 16,
        "memory_available": 5.2,
        "disk_total": 250,
        "disk_available": 82,
        "services": {
            "W3SVC": "Running",
            "SentinelAgent": "Running",
            "Spooler": "Stopped",
        },
    },
    {
        "hostname": "SNTL-APP-01",
        "ip_address": "10.10.2.11",
        "cpu": 67,
        "memory_total": 32,
        "memory_available": 9.4,
        "disk_total": 500,
        "disk_available": 155,
        "services": {
            "AppService": "Running",
            "SentinelAgent": "Running",
            "TaskScheduler": "Running",
        },
    },
    {
        "hostname": "SNTL-APP-02",
        "ip_address": "10.10.2.12",
        "cpu": 81,
        "memory_total": 32,
        "memory_available": 4.8,
        "disk_total": 500,
        "disk_available": 96,
        "services": {
            "AppService": "Running",
            "SentinelAgent": "Running",
            "TaskScheduler": "Stopped",
        },
    },
    {
        "hostname": "SNTL-DB-01",
        "ip_address": "10.10.3.11",
        "cpu": 58,
        "memory_total": 64,
        "memory_available": 18,
        "disk_total": 1000,
        "disk_available": 310,
        "services": {
            "MSSQLSERVER": "Running",
            "SQLAgent": "Running",
            "SentinelAgent": "Running",
        },
    },
    {
        "hostname": "SNTL-DB-02",
        "ip_address": "10.10.3.12",
        "cpu": 74,
        "memory_total": 64,
        "memory_available": 8.5,
        "disk_total": 1000,
        "disk_available": 105,
        "services": {
            "MSSQLSERVER": "Running",
            "SQLAgent": "Stopped",
            "SentinelAgent": "Running",
        },
    },
    {
        "hostname": "SNTL-FILE-01",
        "ip_address": "10.10.4.11",
        "cpu": 24,
        "memory_total": 16,
        "memory_available": 9,
        "disk_total": 2000,
        "disk_available": 180,
        "services": {
            "LanmanServer": "Running",
            "SentinelAgent": "Running",
            "DFSR": "Running",
        },
    },
    {
        "hostname": "SNTL-FILE-02",
        "ip_address": "10.10.4.12",
        "cpu": 89,
        "memory_total": 16,
        "memory_available": 2.1,
        "disk_total": 2000,
        "disk_available": 75,
        "services": {
            "LanmanServer": "Running",
            "SentinelAgent": "Running",
            "DFSR": "Stopped",
        },
    },
    {
        "hostname": "SNTL-MON-01",
        "ip_address": "10.10.5.11",
        "cpu": 41,
        "memory_total": 32,
        "memory_available": 20,
        "disk_total": 500,
        "disk_available": 260,
        "services": {
            "MonitoringService": "Running",
            "SentinelAgent": "Running",
            "W32Time": "Running",
        },
    },
    {
        "hostname": "SNTL-MON-02",
        "ip_address": "10.10.5.12",
        "cpu": 76,
        "memory_total": 32,
        "memory_available": 6.4,
        "disk_total": 500,
        "disk_available": 88,
        "services": {
            "MonitoringService": "Running",
            "SentinelAgent": "Running",
            "W32Time": "Stopped",
        },
    },
    {
        "hostname": "SNTL-BATCH-01",
        "ip_address": "10.10.6.11",
        "cpu": 19,
        "memory_total": 8,
        "memory_available": 4.6,
        "disk_total": 150,
        "disk_available": 92,
        "services": {
            "BatchProcessor": "Stopped",
            "SentinelAgent": "Running",
            "TaskScheduler": "Running",
        },
    },
    {
        "hostname": "SNTL-API-01",
        "ip_address": "10.10.7.11",
        "cpu": 93,
        "memory_total": 16,
        "memory_available": 1.8,
        "disk_total": 300,
        "disk_available": 42,
        "services": {
            "ApiGateway": "Running",
            "SentinelAgent": "Running",
            "Redis": "Running",
        },
    },
]


def seed_servers(db: Session) -> None:
    existing_server = db.scalar(select(Server.id).limit(1))

    if existing_server is not None:
        return

    for item in SERVER_DATA:
        server = Server(
            hostname=item["hostname"],
            ip_address=item["ip_address"],
            cpu_percent=item["cpu"],
            memory_total_gb=item["memory_total"],
            memory_available_gb=item["memory_available"],
            disk_total_gb=item["disk_total"],
            disk_available_gb=item["disk_available"],
        )

        server.services = [
            ServerService(
                service_name=service_name,
                status=status,
            )
            for service_name, status in item["services"].items()
        ]

        db.add(server)

    db.commit()