# backend/tests/test_reminders.py
import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.asyncio
async def test_send_confirmation_calls_whatsapp_service():
    booking_id = "test-booking-uuid"
    with patch("app.tasks.reminders.send_whatsapp_message") as mock_send:
        mock_send.return_value = {"messages": [{"id": "meta-msg-id-123"}]}
        with patch("app.tasks.reminders.get_booking_with_tenant") as mock_get:
            mock_booking = MagicMock()
            mock_booking.id = booking_id
            mock_booking.tenant_id = "tenant-uuid"
            mock_booking.customer_id = "customer-uuid"
            mock_booking.customer.phone_number = "+56912345678"
            mock_booking.customer.name = "Ana"
            mock_booking.service.name = "Corte de pelo"
            mock_booking.scheduled_at.strftime.return_value = "Martes 10:00"
            mock_get.return_value = mock_booking
            with patch("app.tasks.reminders.update_message_log") as mock_log:
                with patch("app.tasks.reminders.create_message_log", return_value="log-uuid-123"):
                    from app.tasks.reminders import _send_booking_confirmation_async
                    task_mock = MagicMock()
                    task_mock.request.retries = 0
                    await _send_booking_confirmation_async(task_mock, booking_id)
                    mock_send.assert_called_once()
                    mock_log.assert_called()


@pytest.mark.asyncio
async def test_send_confirmation_handles_whatsapp_error():
    booking_id = "test-booking-uuid"
    with patch("app.tasks.reminders.send_whatsapp_message") as mock_send:
        mock_send.side_effect = Exception("Meta API error")
        with patch("app.tasks.reminders.get_booking_with_tenant") as mock_get:
            mock_booking = MagicMock()
            mock_booking.id = booking_id
            mock_booking.tenant_id = "tenant-uuid"
            mock_booking.customer_id = "customer-uuid"
            mock_booking.customer.phone_number = "+56912345678"
            mock_booking.customer.name = "Ana"
            mock_get.return_value = mock_booking
            with patch("app.tasks.reminders.update_message_log") as mock_log:
                with patch("app.tasks.reminders.create_message_log", return_value="log-uuid-456"):
                    from app.tasks.reminders import _send_booking_confirmation_async
                    task_mock = MagicMock()
                    task_mock.request.retries = 0
                    task_mock.retry.side_effect = Exception("retry")
                    # No debe lanzar excepción no controlada
                    await _send_booking_confirmation_async(task_mock, booking_id)
                    # Log debe registrar status=failed
                    calls = [str(c) for c in mock_log.call_args_list]
                    assert any("failed" in c for c in calls)
