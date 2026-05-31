from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.services import priority_workflow as workflow


class PriorityWorkflowPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.data_dir = self.root / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.patches = [
            patch.object(workflow, "BASE_DIR", self.root),
            patch.object(workflow, "DATA_DIR", self.data_dir),
            patch.object(workflow, "TRANSACTIONS_FILE", self.data_dir / "transactions.json"),
            patch.object(workflow, "NOTIFICATIONS_FILE", self.data_dir / "notification_database.json"),
            patch.object(workflow, "SCHEDULES_FILE", self.data_dir / "schedule_database.json"),
        ]

        for patcher in self.patches:
            patcher.start()
            self.addCleanup(patcher.stop)

        self.addCleanup(self.temp_dir.cleanup)

    def _write_json(self, path: Path, payload: object) -> None:
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    def _read_json(self, path: Path) -> dict[str, object]:
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_notification_payload(self, records: list[dict[str, object]], protected_ids: list[str] | None = None) -> None:
        payload: dict[str, object] = {
            "database": "notifications",
            "description": "Stores detected recurring utility and top-up payment priorities for user review.",
            "records": records,
        }
        if protected_ids:
            payload["protected_notification_ids"] = protected_ids
        self._write_json(self.data_dir / "notification_database.json", payload)

    def _write_schedule_payload(self, records: list[dict[str, object]]) -> None:
        payload: dict[str, object] = {
            "database": "schedules",
            "description": "Stores user-confirmed payment schedules for recurring utility and top-up payments.",
            "records": records,
        }
        self._write_json(self.data_dir / "schedule_database.json", payload)

    def test_dismissing_notification_removes_record_from_database(self) -> None:
        notification = {
            "notification_id": "NOTIF-001",
            "service_provider": "NEA WiFi Bill",
            "category": "utilities",
            "payment_family": "utilities",
            "average_amount": 1000,
            "latest_amount": 1000,
            "due_amount": 1000,
            "occurrences_in_year": 5,
            "status": "pending",
        }
        self._write_notification_payload([notification])

        dismissed = workflow.dismiss_notification("NOTIF-001")
        payload = self._read_json(self.data_dir / "notification_database.json")

        self.assertEqual(dismissed["notification_id"], "NOTIF-001")
        self.assertEqual(dismissed["status"], "dismissed")
        self.assertEqual(payload["records"], [])
        self.assertIn("protected_notification_ids", payload)
        self.assertIn("NOTIF-001", payload["protected_notification_ids"])

    def test_scheduling_appends_then_updates_schedule_database(self) -> None:
        notification = {
            "notification_id": "NOTIF-100",
            "service_provider": "LBEF College Fee",
            "category": "education",
            "payment_family": "recurring",
            "average_amount": 150000,
            "latest_amount": 150000,
            "due_amount": 150000,
            "due_date": "2026-06-15",
            "latest_transaction_date": "2026-06-01",
            "occurrences_in_year": 5,
            "status": "pending",
        }
        self._write_notification_payload([notification])
        self._write_schedule_payload([])

        first_schedule = workflow.schedule_notification("NOTIF-100", scheduled_date="2026-07-01", scheduled_amount=149999)
        second_schedule = workflow.schedule_notification("NOTIF-100", scheduled_date="2026-07-15", scheduled_amount=150001)
        payload = self._read_json(self.data_dir / "schedule_database.json")

        self.assertEqual(first_schedule["notification_id"], "NOTIF-100")
        self.assertEqual(second_schedule["schedule_id"], first_schedule["schedule_id"])
        self.assertEqual(len(payload["records"]), 1)
        self.assertEqual(payload["records"][0]["notification_id"], "NOTIF-100")
        self.assertEqual(payload["records"][0]["scheduled_date"], "2026-07-15")
        self.assertEqual(payload["records"][0]["scheduled_amount"], 150001.0)

    def test_reseed_detection_preserves_dismissed_notifications(self) -> None:
        self._write_notification_payload(
            [],
            protected_ids=["NOTIF-RESEED-1"],
        )
        self._write_schedule_payload([])

        detected = [
            {
                "notification_id": "NOTIF-RESEED-1",
                "service_provider": "NEA WiFi Bill",
                "category": "utilities",
                "payment_family": "utilities",
                "average_amount": 1000,
                "latest_amount": 1000,
                "due_amount": 1000,
                "occurrences_in_year": 5,
                "priority_score": 0.95,
                "priority_rank": 1,
                "status": "pending",
            }
        ]

        with patch.object(workflow, "load_transactions_history", return_value=[]), patch.object(
            workflow, "_group_transactions", return_value=detected
        ):
            workflow.build_priority_notifications(persist=True)

        payload = self._read_json(self.data_dir / "notification_database.json")
        self.assertEqual(payload["records"], [])
        self.assertIn("NOTIF-RESEED-1", payload.get("protected_notification_ids", []))


if __name__ == "__main__":
    unittest.main()
