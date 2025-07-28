import json
import os
from datetime import datetime
from typing import Dict, Any
from colorama import init, Fore, Style

init()  # Initialize colorama


class ConversationLogger:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        
    def log_negotiation(self, negotiation_data: Dict[str, Any]) -> None:
        """Log a complete negotiation to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"negotiation_{timestamp}.json"
        filepath = os.path.join(self.log_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(negotiation_data, f, indent=2, default=str)
            
    def print_offer(self, agent_name: str, offer_price: float, message: str, is_buyer: bool = True) -> None:
        """Print a colorized offer to console"""
        color = Fore.BLUE if is_buyer else Fore.GREEN
        agent_type = "BUYER" if is_buyer else "SELLER"
        
        print(f"{color}[{agent_type}] {agent_name}: ${offer_price:.2f}{Style.RESET_ALL}")
        print(f"  💬 {message}")
        print()
        
    def print_negotiation_start(self, item_name: str, starting_price: float) -> None:
        """Print negotiation start banner"""
        print(f"{Fore.YELLOW}{'='*50}")
        print(f"🪑 NEGOTIATION STARTED: {item_name}")
        print(f"💰 Starting Price: ${starting_price:.2f}")
        print(f"{'='*50}{Style.RESET_ALL}")
        print()
        
    def print_negotiation_end(self, result: str, final_price: float = None) -> None:
        """Print negotiation end result"""
        if result == "deal_accepted":
            print(f"{Fore.GREEN}🤝 DEAL ACCEPTED! Final price: ${final_price:.2f}{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}❌ NO DEAL - Negotiation failed{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}{'='*50}{Style.RESET_ALL}")
        print()
        
    def print_summary_stats(self, total_negotiations: int, successful_deals: int, avg_rounds: float) -> None:
        """Print summary statistics"""
        success_rate = (successful_deals / total_negotiations) * 100 if total_negotiations > 0 else 0
        
        print(f"{Fore.CYAN}📊 SUMMARY STATISTICS")
        print(f"Total Negotiations: {total_negotiations}")
        print(f"Successful Deals: {successful_deals}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Average Rounds: {avg_rounds:.1f}{Style.RESET_ALL}")
        print()