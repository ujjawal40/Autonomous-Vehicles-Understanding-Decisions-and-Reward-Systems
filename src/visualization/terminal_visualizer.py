"""
Terminal Visualizer

Rich terminal-based visualization for RL decisions and rewards.
Shows real-time decision making with color-coded outputs.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich import box
    HAS_RICH = True
except ImportError:
    HAS_RICH = False


class TerminalVisualizer:
    """
    Visualizes RL decisions in the terminal using Rich library.

    Provides colorful, informative output showing:
    - Current state
    - Action taken and alternatives
    - Reward breakdown
    - Risk assessment
    """

    def __init__(self):
        if not HAS_RICH:
            print("Warning: 'rich' library not installed. Using basic output.")
            self.console = None
        else:
            self.console = Console()

    def display_step(
        self,
        step: int,
        action: int,
        action_name: str,
        reward_breakdown: Dict[str, Any],
        action_probs: Optional[Dict[int, float]] = None
    ) -> None:
        """Display a single step's information."""
        if not HAS_RICH or self.console is None:
            self._basic_display(step, action, action_name, reward_breakdown)
            return

        # Create main table
        table = Table(
            title=f"Step {step}",
            box=box.ROUNDED,
            show_header=True,
            header_style="bold magenta"
        )

        table.add_column("Component", style="cyan")
        table.add_column("Value", style="green")
        table.add_column("Explanation", style="white")

        # Add action row
        table.add_row(
            "ACTION",
            f"{action} ({action_name})",
            "Decision made by agent",
            style="bold yellow"
        )

        # Add reward components
        components = reward_breakdown.get("components", {})
        explanations = reward_breakdown.get("explanations", {})

        for name, value in components.items():
            color = "green" if value >= 0 else "red"
            table.add_row(
                name.upper(),
                f"[{color}]{value:+.3f}[/{color}]",
                explanations.get(name, "")
            )

        # Add total
        total = reward_breakdown.get("total_reward", 0)
        total_color = "green" if total >= 0 else "red"
        table.add_row(
            "TOTAL REWARD",
            f"[bold {total_color}]{total:+.3f}[/bold {total_color}]",
            "",
            style="bold"
        )

        # Add risk
        risk = reward_breakdown.get("total_risk", 0)
        risk_color = "green" if risk < 0.3 else "yellow" if risk < 0.7 else "red"
        table.add_row(
            "RISK LEVEL",
            f"[{risk_color}]{risk:.1%}[/{risk_color}]",
            self._get_risk_description(risk)
        )

        self.console.print(table)
        self.console.print()

    def display_action_probabilities(
        self,
        action_probs: Dict[int, float],
        chosen_action: int,
        action_names: Dict[int, str]
    ) -> None:
        """Display action probability distribution."""
        if not HAS_RICH or self.console is None:
            return

        table = Table(
            title="Action Probabilities",
            box=box.SIMPLE,
            show_header=True
        )

        table.add_column("Action", style="cyan")
        table.add_column("Probability", style="white")
        table.add_column("Bar", style="blue")

        # Sort by probability
        sorted_probs = sorted(action_probs.items(), key=lambda x: x[1], reverse=True)

        for action, prob in sorted_probs:
            name = action_names.get(action, f"Action {action}")
            bar_length = int(prob * 30)
            bar = "█" * bar_length + "░" * (30 - bar_length)

            style = "bold green" if action == chosen_action else ""
            marker = " ← CHOSEN" if action == chosen_action else ""

            table.add_row(
                f"{name}",
                f"{prob:.1%}{marker}",
                bar,
                style=style
            )

        self.console.print(table)
        self.console.print()

    def display_episode_summary(
        self,
        episode: int,
        total_steps: int,
        total_reward: float,
        terminated_by_collision: bool
    ) -> None:
        """Display end-of-episode summary."""
        if not HAS_RICH or self.console is None:
            print(f"\n=== Episode {episode} Complete ===")
            print(f"Steps: {total_steps}, Reward: {total_reward:.2f}")
            return

        status = "[red]COLLISION[/red]" if terminated_by_collision else "[green]COMPLETED[/green]"

        panel = Panel(
            f"Steps: {total_steps}\n"
            f"Total Reward: {total_reward:.2f}\n"
            f"Status: {status}",
            title=f"Episode {episode} Summary",
            border_style="blue"
        )

        self.console.print(panel)

    def _get_risk_description(self, risk: float) -> str:
        """Get human-readable risk description."""
        if risk < 0.1:
            return "Very safe operation"
        elif risk < 0.3:
            return "Normal driving conditions"
        elif risk < 0.5:
            return "Elevated caution advised"
        elif risk < 0.7:
            return "High risk - careful monitoring"
        else:
            return "Critical risk - immediate action needed"

    def _basic_display(
        self,
        step: int,
        action: int,
        action_name: str,
        reward_breakdown: Dict[str, Any]
    ) -> None:
        """Basic display without Rich library."""
        print(f"\n--- Step {step} ---")
        print(f"Action: {action} ({action_name})")
        print(f"Total Reward: {reward_breakdown.get('total_reward', 0):.3f}")

        components = reward_breakdown.get("components", {})
        for name, value in components.items():
            print(f"  {name}: {value:+.3f}")
