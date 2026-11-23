from enum import Enum


class Role(str, Enum):
    resident = "resident"
    personnel = "personnel"
    admin = "admin"


class RequestStatus(str, Enum):
    PENDING = "Pending"
    SCHEDULED = "Scheduled"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class WasteType(str, Enum):
    household = "Household"
    recyclable = "Recyclable"
    organic = "Organic"
    garden = "Garden"
    bulky = "Bulky"
    other = "Other"


class TimeWindow(str, Enum):
    morning = "Morning"
    afternoon = "Afternoon"
    evening = "Evening"


STAFF_ROLES = (Role.personnel, Role.admin)
ACTIVE_STATUSES = [RequestStatus.SCHEDULED.value, RequestStatus.ASSIGNED.value, RequestStatus.IN_PROGRESS.value]
FINAL_STATUSES = [RequestStatus.COMPLETED.value, RequestStatus.CANCELLED.value]
OPEN_TASK_STATUSES = [RequestStatus.ASSIGNED.value, RequestStatus.IN_PROGRESS.value]
