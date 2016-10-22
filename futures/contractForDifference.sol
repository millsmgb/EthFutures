

/*
 * A contract for difference is a contract where the difference in value is paid 
 * for the security over the course of the duration of the contract. In this 
 * case, the difference is marked to market daily until either a margin call occurs
 * or the CFD complete - an example is that if A goes short and B goes long, if the
 * value of the underlying security increases, A must pay B the difference and vice-versa
 */

import "priceTickerETHUSD.sol";

contract ContractForDifference {

    // Manage the balances of the margins
    mapping (address => uint) private balance;

    // Keep address of owner
    address public owner;

    // Address for both short and long positions for the CFD
    address[] private margins;

    // Price Ticker Value
    uint private prevETHUSD;
    
    // Address of Oracle
    ETHUSDPriceTicker public oracleETHUSD;

    // Check if terminated
    bool public isTerminated;
    // Events to indicate that the CFD has been marked
    event CFDMarkShort(uint amount);
    event CFDMarkLong(uint amount);
    event updatedMargin(address accountAddress, uint amount);
    
    function ContractForDifference() {
        owner = msg.sender;
        margins.push(owner); 
        oracleETHUSD = new ETHUSDPriceTicker();
        prevETHUSD = oracleETHUSD.ETHUSD; 
        isTerminated = false;
    }

    function deposit() public returns (uint) {
        if(isTerminated) {
            throw;
        }
        margins.push(msg.sender);
        if (margins.length > 2){
            throw;
        }
        balances[msg.sender] += msg.value;

        updatedMargin(msg.sender, msg.value);
        return balances[msg.sender];
    }

    function withdraw(uint withdrawAmount) public returns (uint remainingBal) {
        if(balances[msg.sender] >= withdrawAmount) {
            balances[msg.sender] -= withdrawAmount;
            
            if (!msg.sender.send(withdrawAmount)) {
                balances[msg.sender] += withdrawAmount;
            }
        }

        return balances[msg.sender];
    }

    function mark(uint currPrice) public {
        if (isTerminated) {
            throw;
        }
        uint priceDiff = (currPrice - prevETHUSD);
        
        if (margins[0] <= priceDiff) {
            liquidateShort();
        }
        else if (margins[1] <= priceDiff) {
            liquidateLong();
        }
        else {
            balances[margins[0]] -= priceDiff;
            balances[margins[1]] += priceDiff;
            prevETHUSD = currPrice;
            updatedMargin(margins[0], (-1)*priceDiff);
            updatedMargin(margins[1], priceDiff);
        }
    }

    function liquidateShort() public {
        balances[margins[1]] += balances[margins[0]];
        balances[margins[0]] = 0;
        isTerminated = true;
    }

    function liquidateLong() public {
        balances[margins[0]] += balances[margins[1]];
        balances[margins[1]] = 0;
        isTerminated = true;
        terminate();
    }
    
    function () {
        throw;
    }
}
