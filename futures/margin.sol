pragma solidity ^0.4.0;

// Where one side of the futures contract deposits their "margin"
// this contract then sends/receives the amount of Ethereum determined by the future
// when it is marked to market
    

contract Margin {
    // Address of the futures contract    
    address public futureContract;
    
    // Parameters of the futures contract is synced with the margin 
    // this offers a degree of error checking such that withdrawals and
    // deposits cannot be made before or after the future is active 
    uint public futureStart;
    uint public futureEnd;

    // Address of the owner of the margin account
    address public owner;

    // Update the amount currently held in the margin account
    uint public marginAmount;

    // Set to true at the end so as to disallow any changes and return any
    // remaining margin to the owner 
    bool ended;

    // Events that will be fired on changes
    event MarginIncrease(uint amount);
    event FutureClosed(uint amount);

    /// Create a margin contract with the associated future contract
    /// defined in the state variable futureContract
    /// also define the start of the margin contract **Need to think this through**
    /// then links the margin to an owner account **Also need to think this through** 
    function Margin(address _futureContract, uint _futureStart, 
                   uint _futureEnd, address _owner) {
        futureContract = _futureContract;
        futureStart = _futureStart;
        futureEnd = _futureEnd;
        owner = _owner;
        
        // As Solidity is strictly typed, we must 0 initialise our amount in the 
        // margin account upon contract creation
        marginAmount = 0;
    }

    /// Increase the amount of Ether held by the margin account 
    /// note that this is a cumulative action, hence calling this 
    /// will continually increase the margin
    function deposit() payable {
        // No need for arguments, as the amount to add is part of the transaction
        // the keyword payable is required for the function to be allowed 
        // to receive Ether

        if (now > futureEnd) {
            // Revert the call should the future contract have finished
            // just in case for whatever reason the margin account is 
            // still active - yay for error checking
            throw;
        }
        // increase the amount of Ether held in the margin account by the value
        // sent by the owner 
        marginAmount = marginAmount + msg.value;
                
        // Log the increase
        MarginIncrease(msg.sender, msg.value);
    }
    
    // Withdraw from the margin account 
    // Need to account for the liquidity minimums as well as how to do margin calls
    function withdraw() returns (bool) {
        var amount = msg.sender;
        if (amount > 0) {
            if (!msg.sender.send(amount)) {
                return false;
            }
            return true;
        }
    }

    // Close the margin account either due to the Future contract ending or 
    // due to the margin being liquidaed as a result of 
