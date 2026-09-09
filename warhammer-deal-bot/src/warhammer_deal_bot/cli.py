"""Command-line entry point designed for external schedulers."""

import argparse
import logging
import os
from pathlib import Path

from .alerts import send_email
from .config import load_config
from .database import Database
from .service import run


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="warhammer-deal-bot")
    parser.add_argument("--config", default=os.environ.get("DEAL_BOT_CONFIG", "config.yaml"))
    parser.add_argument("--verbose", action="store_true")
    commands = parser.add_subparsers(dest="command", required=True)
    run_parser = commands.add_parser("run", help="Search enabled sources once")
    run_parser.add_argument("--source")
    run_parser.add_argument("--product")
    commands.add_parser("test-email", help="Send a configuration test email")
    commands.add_parser("report", help="Summarize the last 30 days")
    authorize_parser = commands.add_parser(
        "gmail-authorize", help="Connect Gmail through browser consent (Windows)"
    )
    authorize_parser.add_argument("--client-secrets", required=True, type=Path)
    commands.add_parser("gmail-status", help="Check saved Gmail authorization without sending")
    commands.add_parser("gmail-forget", help="Remove this bot's locally saved Gmail authorization")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        if args.command.startswith("gmail-"):
            from .gmail import authorization_status, authorize, forget_authorization

            if args.command == "gmail-authorize":
                authorize(args.client_secrets)
                print(
                    "Gmail connected. Send-only authorization saved in Windows Credential Manager."
                )
            elif args.command == "gmail-forget":
                forget_authorization()
                print(
                    "Local grant removed. To revoke Google access too, visit https://myaccount.google.com/connections"
                )
            else:
                print(authorization_status())
            return 0
        config = load_config(Path(args.config))
        if args.command == "run":
            deals = run(config, args.source, args.product)
            logging.info("run complete: %d new alertable deal(s)", len(deals))
        elif args.command == "test-email":
            send_email(
                config.email,
                "Warhammer Deal Bot — test email",
                "Your Warhammer Deal Bot email configuration works.",
                "<p>Your Warhammer Deal Bot email configuration works.</p>",
            )
            print("Test email sent. Check the recipient's inbox.")
        else:
            rows = Database(config.database).report_rows()
            print("Product | Listings | Average | Lowest | Alerts")
            for row in rows:
                print(
                    f"{row['name']} | {row['listings']} | {row['average_price'] or '-'} | "
                    f"{row['lowest_price'] or '-'} | {row['alerts']}"
                )
        return 0
    except (OSError, ValueError) as error:
        logging.error("fatal: %s", error)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
