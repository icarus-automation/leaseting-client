# Keepinv Kitchen Printer Integration — Claude Implementation Context

## Purpose

This document captures the discussion, requirements, technical constraints, and locked decisions for implementing automatic kitchen-ticket printing in Keepinv.

It is intended as implementation context for Claude. Before changing code, Claude should inspect the actual Keepinv repositories and map this plan to the existing Angular, NestJS, PostgreSQL, order-confirmation, authentication, and deployment patterns. Do not invent file paths or duplicate infrastructure that already exists.

---

## Product context

Keepinv is a POS and inventory product. A new client needs a kitchen-side printed ticket that acts as a guide for pending orders and helps staff serve the correct items.

This document covers **printer integration only**. A kitchen display system, preparation workflow, and serving-status interface are not part of the initial implementation.

---

## Locked decisions

These decisions have already been made and should not be reopened unless implementation testing proves one technically impossible.

| Area | Locked decision |
|---|---|
| Scope | Printer integration only |
| Print trigger | Print automatically when an order is successfully confirmed |
| POS interface | Keepinv runs as a web application in Chrome on an Android tablet |
| Tablet location | The Android tablet stays beside or near the kitchen printer |
| Initial printer | Xprinter XP-58IIH |
| XP-58IIH interfaces | The actual unit owned by Ace supports Bluetooth + USB |
| Initial transport | Bluetooth is the expected first transport; USB remains available for testing/fallback |
| Paper | 58mm thermal paper |
| Hardware purchase | Reuse the existing brand-new printer; do not buy a new printer initially |
| Initial ticket fields | Order number, confirmation time, item quantity/name, modifiers, and notes |
| Order edits | Out of scope for the initial version |
| Order cancellations | Out of scope for the initial version |
| Kitchen display/status workflow | Out of scope |
| Printing interaction | Automatic; no print dialog and no staff button for the original ticket |
| Production architecture | Intentionally not locked; Claude must evaluate the alternatives below after inspecting the codebase |

A brand-new XP-58IID Bluetooth + USB printer is also available as backup, but the initial target is the **XP-58IIH**.

---

## Main functional requirement

When an order transitions successfully into the confirmed state:

1. Keepinv must create one kitchen print request.
2. The XP-58IIH must print the ticket automatically.
3. The original ticket must not require an Android print dialog, Share action, or staff interaction.
4. Duplicate frontend requests must not produce duplicate original tickets.
5. A temporarily unavailable printer must not cause the order confirmation itself to fail.
6. Failed print requests must remain visible/recoverable rather than disappearing silently.

The trigger must be the successful backend/domain transition to **confirmed**, not merely a frontend button click. This prevents a browser retry or double-click from generating duplicate tickets.

---

## Important technical constraint

A normal website running in Android Chrome cannot directly and silently send ESC/POS data to a Bluetooth Classic/SPP receipt printer.

The cloud-hosted Keepinv backend also cannot directly connect to a Bluetooth device inside the client's kitchen.

Therefore, automatic printing requires some form of local Android-side print bridge. Buying a LAN printer would improve the physical connection, but it would not by itself remove the browser/cloud-to-local-network restriction.

The XP-58IIH should be treated as an ESC/POS-style 58mm receipt printer, but its exact commands, character set, Bluetooth behavior, and printable width must be verified using the physical unit.

---

## Architecture decision intentionally left to Claude

Ace explicitly chose: **document the alternatives and let Claude decide during implementation**.

Claude must inspect the existing codebase and select the simplest reliable architecture. The recommendation must be explained before major implementation begins.

### Alternative A — Custom native Android print bridge + backend print queue

Conceptual flow:

```text
Keepinv web POS
    -> confirms order through HTTPS
Keepinv backend
    -> stores durable print job
Android print bridge
    -> polls or subscribes for jobs
    -> formats ESC/POS
    -> sends through Bluetooth
XP-58IIH
    -> prints ticket
```

Potential implementation:

- Small native Kotlin Android application installed beside Chrome.
- Android foreground service so printing continues while Chrome is active.
- Secure device activation/token.
- HTTPS polling or existing realtime infrastructure for job delivery.
- Local storage of sent job IDs for duplicate protection.
- Bluetooth Classic/SPP connection to XP-58IIH.
- ESC/POS formatting through a library or a small internal adapter.

Pros:

- Full control over automatic/silent printing.
- Reliable retry and monitoring behavior.
- Can support Bluetooth, USB, and future LAN transports behind an interface.
- Does not require rewriting the POS web application.

Cons:

- Adds an Android application that must be built, signed, installed, and maintained.
- Android background-service and Bluetooth permissions must be handled correctly.

This was the assistant's recommended production architecture during planning, but it was **not locked by Ace**.

### Alternative B — RawBT as the production bridge

RawBT supports Bluetooth, USB, and Ethernet/Wi-Fi thermal printers and can receive content from Android applications/websites through supported integration methods.

Pros:

- Fastest route to hardware validation.
- Less custom Android code.
- Supports the existing Bluetooth printer.

Cons and required proof:

- Claude must verify the current documented integration mechanism.
- Must prove fully automatic printing without an Android dialog or manual Share action.
- Must prove reliable background execution and reconnection.
- Introduces a third-party runtime dependency and licensing/support considerations.
- Must prove duplicate handling and job acknowledgment behavior.

RawBT is approved for the initial hardware spike. Do not assume it is production-suitable until silent automatic printing is demonstrated end to end.

### Alternative C — Capacitor/native wrapper around the Keepinv web POS

The Angular web application can potentially be packaged as an Android application and call a native ESC/POS/Bluetooth plugin.

Pros:

- Printing can be invoked directly from the POS application.
- A single installed application could contain both the web interface and native printing.

Cons:

- Changes the delivery model from normal Chrome web usage to an installed wrapper.
- Couples printer support to the POS client.
- May increase release and device-management complexity.
- Existing Capacitor printer plugins must be evaluated for maturity and Android compatibility.

Use only if wrapping the existing application is simpler than maintaining a separate bridge and is acceptable after codebase inspection.

### Architecture selection criteria

Choose the option that best satisfies all of the following:

1. Automatic printing after backend-confirmed order.
2. No Android print dialog.
3. Reliable operation while the web POS is open.
4. Recovery after internet, Bluetooth, printer, app, or tablet interruption.
5. Strong duplicate protection.
6. Minimal new dependencies and operational burden.
7. Clear upgrade path to an 80mm LAN printer later.
8. Compatibility with the existing Keepinv architecture and deployment model.

Do not choose solely based on the smallest demo. Choose the smallest approach that remains supportable in production.

---

## Recommended logical print flow

Regardless of the selected Android architecture, preserve the following behavior:

```text
Order confirmation begins
    -> validate order
    -> save confirmed state
    -> create one durable kitchen print request
    -> commit transaction
    -> return successful confirmation

Local Android printing component
    -> receives/claims pending request
    -> records job locally
    -> renders 58mm ESC/POS ticket
    -> sends data to XP-58IIH over Bluetooth
    -> records local sent state
    -> acknowledges result to backend
```

Order confirmation and print-request creation should be atomic whenever the existing persistence architecture allows it. A confirmed order must not be created without its corresponding print request.

The printer must not be contacted synchronously inside the order-confirmation HTTP request. Printer problems must not block sales processing.

---

## Suggested durable print-job design

If the selected architecture includes a backend queue, the following model is recommended. Adapt names and implementation to the existing ORM and conventions.

### Print-job states

```text
QUEUED -> CLAIMED -> SENT
                   -> FAILED -> retry/QUEUED
```

Use `SENT`, not `PRINTED`. A basic Bluetooth receipt printer generally cannot prove that paper physically exited; the software can only confirm that data was written successfully to the connection.

### Suggested print-job fields

- `id`
- `branchId` or equivalent tenant/store identifier
- `orderId`
- `type` (`KITCHEN_ORDER`, later `REPRINT`)
- `payload`
- `status`
- `idempotencyKey`
- `claimedByDeviceId`
- `claimedAt`
- `leaseExpiresAt`
- `attemptCount`
- `sentAt`
- `lastError`
- `createdAt`
- `updatedAt`

### Idempotency

The original ticket needs a unique idempotency key comparable to:

```text
KITCHEN_ORDER:{orderId}:CONFIRMED
```

Enforce uniqueness at the database level. Repeated confirmation requests must not create multiple original kitchen tickets.

### Device record, if needed

A print device may need:

- Device ID
- Branch/store assignment
- Human-readable name such as `Kitchen Tablet 1`
- Revocable device token
- Enabled/disabled state
- Printer profile (`58MM_BLUETOOTH`)
- Last heartbeat
- Last successful send
- Application version

Keep the Bluetooth MAC/address locally on the Android device unless the existing architecture has a reason to centralize it.

---

## Suggested printer-neutral payload

The backend should preferably send semantic ticket data, not preformatted Bluetooth bytes. This keeps hardware-specific formatting on the local printing side.

Conceptual payload:

```json
{
  "jobId": "print-job-id",
  "orderId": "order-id",
  "orderNumber": "1042",
  "confirmedAt": "ISO-8601 timestamp",
  "items": [
    {
      "quantity": 2,
      "name": "Chicken Adobo",
      "modifiers": ["No chili"],
      "notes": null
    },
    {
      "quantity": 1,
      "name": "Iced Tea",
      "modifiers": ["Less ice"],
      "notes": null
    }
  ],
  "isReprint": false
}
```

Only these initial ticket fields are locked:

- Order number
- Confirmation time
- Item quantity
- Item name
- Modifiers
- Notes

Do not add prices, customer information, table number, order type, cashier name, or other fields without a product decision.

---

## Initial 58mm ticket concept

The physical printer must determine the final column count and formatting. Use a compact layout similar to:

```text
        KITCHEN
ORDER #1042      10:42
------------------------
2  CHICKEN ADOBO
   - No chili

1  ICED TEA
   - Less ice
------------------------
```

Formatting priorities:

1. Order number must be highly visible.
2. Quantity must be unambiguous.
3. Item names should be emphasized where supported.
4. Modifiers and notes must be clearly subordinate to the correct item.
5. Long content must wrap without losing information.
6. Feed enough blank paper for easy manual tearing.
7. Do not rely on Unicode until the XP-58IIH character/code-page support is tested.

The XP-58IIH is a 58mm printer, so long item names and notes will wrap more often than on an 80mm printer. This is accepted for the initial implementation, subject to client readability testing.

---

## Reliability requirements

### Printer unavailable

- Order confirmation succeeds.
- Print request remains recoverable.
- System reports an actionable failure/status.
- Printing resumes after reconnection.

### Internet unavailable

- Do not discard known job state.
- Retry with backoff.
- Recover automatically when connectivity returns.

### Bluetooth disabled/disconnected

- Show a local warning if an Android component is used.
- Retry connection without requiring staff to re-pair during ordinary interruptions.
- Avoid infinite tight retry loops.

### App or tablet restart

- Local bridge must recover its previous state.
- Background printing must resume.
- If a custom Android bridge is selected, evaluate a foreground service and boot receiver.
- Android battery optimization/device-vendor process killing must be tested.

### Duplicate handling

Exactly-once physical printing cannot be perfectly guaranteed with a simple thermal printer lacking physical print acknowledgment.

Use multiple protection layers:

- Unique backend idempotency key
- One active claim/lease per job
- Local sent-job history
- Record local sent state before backend acknowledgment
- Explicitly marked manual reprints

Favor a recoverable system with strong duplicate protection. Never silently drop a kitchen order.

---

## Manual reprint

A manual reprint mechanism is recommended even though the original ticket prints automatically.

A reprint must create a new auditable print job and visibly mark the output:

```text
******** REPRINT ********
```

Do not reset or reuse the original print job to implement a reprint.

If reprinting is considered outside the first coding slice, preserve the data model so it can be added without redesign.

---

## Scope

### Included initially

- XP-58IIH hardware validation
- Android-to-printer Bluetooth validation
- Automatic original ticket after successful order confirmation
- 58mm ESC/POS ticket formatting
- Durable/recoverable print delivery appropriate to the selected architecture
- Duplicate protection
- Failure visibility and retry behavior
- Basic printer/device status needed for support
- Tests for interrupted connectivity and restarts

### Explicitly out of scope

- Kitchen display system
- Pending/preparing/ready/served status workflow
- Item-level kitchen status
- Multiple kitchen stations
- Routing different products to different printers
- Automatic update tickets
- Automatic cancellation tickets
- Customer receipts
- Cashier receipts
- Purchase of a new printer
- 80mm ticket redesign

Do not let excluded kitchen workflow features enter the printer implementation.

---

## Implementation phases

### Phase 0 — Inspect the actual codebase

Before coding:

- Locate the authoritative order-confirmation logic.
- Identify the ORM and transaction pattern.
- Identify existing domain events, queues, outbox, WebSocket, polling, or background-job infrastructure.
- Identify branch/tenant boundaries.
- Identify existing device authentication patterns.
- Inspect Angular confirmation behavior and retry behavior.
- Determine Android minimum/target SDK if an Android project already exists.
- Determine whether Keepinv already has an Android wrapper or companion application.

Do not create duplicate queue or realtime infrastructure if the project already has a suitable implementation.

### Phase 1 — Physical hardware spike

- Print the XP-58IIH self-test/configuration page.
- Confirm Bluetooth pairing with the target Android tablet.
- Use RawBT or another controlled test tool to print plain text.
- Test item names, modifiers, notes, wrapping, line feeds, and common characters.
- Print at least 30 sequential sample tickets.
- Power-cycle the printer and verify reconnection behavior.
- Leave it idle, then print again.
- Record actual printable width and supported formatting.
- Verify whether manual tearing is acceptable.

Exit condition: XP-58IIH prints readable, repeatable tickets from the target tablet.

### Phase 2 — Architecture spike and decision

Evaluate the documented alternatives using the actual repository and hardware.

The chosen approach must demonstrate:

- Fully automatic printing
- No Android print dialog
- Operation while Chrome is being used
- Recovery after Bluetooth interruption
- A credible production deployment/update process

Write a short architecture decision record before the full build.

### Phase 3 — Backend delivery and idempotency

- Connect print-request creation to the authoritative confirmed-order transition.
- Make order confirmation and print-request creation atomic where feasible.
- Add database-level idempotency.
- Implement delivery/claiming according to the selected architecture.
- Add retry, lease expiration, and acknowledgment if using a queue.
- Add branch/device authorization.
- Add logs without leaking credentials or sensitive data.

Required tests:

- One confirmation creates one original print request.
- Duplicate confirmation creates no duplicate original request.
- Failed confirmation creates no request.
- A device cannot retrieve another branch's jobs.
- Interrupted claims recover.
- Sent jobs are not normally sent again.

### Phase 4 — Local Android printing component

Depending on the selected architecture:

- Implement secure activation/configuration.
- Select and persist the XP-58IIH Bluetooth device.
- Implement ESC/POS formatting behind an internal interface.
- Implement local sent-job persistence.
- Implement background execution.
- Implement reconnect/backoff behavior.
- Implement status and test-print controls.
- Implement result acknowledgment.
- Ensure the component remains operational while Chrome is open.

Keep the printing layer transport-agnostic where practical:

```text
PrinterTransport
- Bluetooth transport now
- USB transport if needed
- TCP/LAN transport later
```

### Phase 5 — End-to-end validation

Test with the real Keepinv confirmation flow:

- One normal order
- Duplicate confirmation request
- 50 sequential orders
- Multiple quick confirmations
- Long item names
- Multiple modifiers
- Long notes
- Special characters used by actual products
- Bluetooth off/on
- Printer off/on
- Internet off/on
- Android bridge force-stop/restart
- Tablet reboot
- Extended idle period
- Multi-hour soak test

Verify that queued work recovers and that no failure silently loses a ticket.

### Phase 6 — Client pilot

- Install the XP-58IIH beside the Android tablet.
- Keep both devices powered.
- Install/configure the production bridge if required.
- Disable problematic battery optimization where necessary.
- Print a production test ticket.
- Train staff to reload paper and recognize failures/reprints.
- Monitor failures and queue state during initial service.
- Collect feedback specifically about 58mm readability and Bluetooth stability.

---

## Acceptance criteria

The initial feature is complete when all of the following are true:

- An order prints automatically only after successful backend confirmation.
- The original ticket requires no Android print dialog or staff action.
- One confirmed order normally produces one original ticket.
- Duplicate confirmation requests do not create duplicate original tickets.
- The ticket contains only the locked initial fields.
- The physical 58mm output is readable and approved.
- Printer or Bluetooth failure does not cause order confirmation to fail.
- Interrupted jobs remain visible and recoverable.
- Printing resumes after ordinary Bluetooth, internet, app, and tablet interruptions.
- The system exposes enough status information to troubleshoot failures.
- The implementation has an upgrade path to an 80mm LAN printer without redesigning order confirmation.

---

## Future hardware upgrade

A previously evaluated cost-efficient upgrade was the Xprinter T80Q USB + LAN, 80mm, auto-cutter printer. It is **not part of the initial implementation or purchase plan**.

Only reconsider an 80mm LAN printer if the pilot reveals a real issue:

- 58mm tickets are too narrow.
- Bluetooth reconnects unreliably.
- The tablet and printer can no longer remain near each other.
- Multiple devices need to print.
- Automatic cutting becomes important.
- Order volume exceeds the practical capability of the existing printer.

A LAN printer still requires a local Android/native bridge when the POS runs in Chrome and the backend is cloud-hosted.

---

## Instructions to Claude

1. Treat the locked decisions as product requirements.
2. Inspect the actual repositories before proposing file changes.
3. Do not assume a custom Android bridge is mandatory if an existing reliable mechanism already satisfies every acceptance criterion.
4. Do not assume RawBT is production-ready without demonstrating silent automatic printing and recovery.
5. Present the selected architecture and rationale before the full implementation.
6. Prefer the simplest maintainable solution; do not reinvent queue/realtime/device-auth infrastructure already present in Keepinv.
7. Keep kitchen display/status features out of scope.
8. Use the physical XP-58IIH early; do not postpone hardware validation until the end.
9. Implement and test idempotency before relying on retries.
10. Do not report success until the real printer has produced tickets from the real order-confirmation flow.

---

## Concise implementation directive

Build automatic kitchen-ticket printing for Keepinv using the existing XP-58IIH Bluetooth + USB 58mm printer beside an Android tablet running the Keepinv web POS in Chrome. Print exactly once under normal operation when the backend successfully confirms an order. The initial ticket contains order number, confirmation time, item quantity/name, modifiers, and notes. Order edits, cancellations, kitchen displays, and new printer purchases are out of scope. Inspect the codebase, evaluate the documented Android bridge alternatives, choose the simplest production-reliable architecture, validate it against the real printer, and preserve a future path to an 80mm LAN printer.
