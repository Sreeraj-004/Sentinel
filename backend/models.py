from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Text,
    Column,

)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hostname: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    ip_address: Mapped[str] = mapped_column(String(45), unique=True)

    cpu_percent: Mapped[float] = mapped_column(Float)

    memory_total_gb: Mapped[float] = mapped_column(Float)
    memory_available_gb: Mapped[float] = mapped_column(Float)

    disk_total_gb: Mapped[float] = mapped_column(Float)
    disk_available_gb: Mapped[float] = mapped_column(Float)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    services: Mapped[list["ServerService"]] = relationship(
        back_populates="server",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ServerService(Base):
    __tablename__ = "server_services"

    __table_args__ = (
        UniqueConstraint(
            "server_id",
            "service_name",
            name="uq_server_service",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    server_id: Mapped[int] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE"),
        index=True,
    )

    service_name: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(20))

    server: Mapped["Server"] = relationship(
        back_populates="services",
    )

class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    language: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        default="",
    )

    content: Mapped[str] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    when_to_use = mapped_column(Text, nullable=False, default="")
    why_to_use = mapped_column(Text, nullable=False, default="")


class HealthCheckLog(Base):
    __tablename__ = "health_check_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    server_id: Mapped[int] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE"),
        index=True,
    )

    level: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    server: Mapped["Server"] = relationship()

class ActionRequest(Base):
    __tablename__ = "action_requests"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False,
        index=True,
    )
    resource = Column(String(30), nullable=False)
    observed_value = Column(Float, nullable=False)

    issue = Column(Text, nullable=False)
    action_title = Column(String(150), nullable=False)
    action_details = Column(Text, nullable=False)

    status = Column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    # Only one active warning episode per server/resource.
    active_key = Column(String(100), unique=True, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )