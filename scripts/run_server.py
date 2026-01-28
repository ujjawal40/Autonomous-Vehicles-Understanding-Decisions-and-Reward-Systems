#!/usr/bin/env python3
"""
Server Script

Run the FastAPI server for the Autonomous Decision Visualizer.
"""

import argparse
import uvicorn


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run the Autonomous Decision Visualizer API server"
    )

    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to"
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to"
    )

    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes"
    )

    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Log level"
    )

    return parser.parse_args()


def main():
    """Run the server."""
    args = parse_args()

    print("=" * 60)
    print("Autonomous Decision Visualizer - API Server")
    print("=" * 60)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Reload: {args.reload}")
    print(f"Workers: {args.workers}")
    print("=" * 60)
    print()

    uvicorn.run(
        "src.api.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1,
        log_level=args.log_level,
        reload_dirs=["src"] if args.reload else None,
    )


if __name__ == "__main__":
    main()
