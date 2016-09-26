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
    uint public owner;

    // Set to true at the end so as to disallow any changes and return any
    // remaining margin to the owner 
    bool ended;

    // Events that will be fired on changes
    event MarginIncrease(uint amount);
    event FutureClosed(uint amount);

    /// Create a margin contract with the associated future contract
    /// defined in the state variable futureContract
    /// also define the start of the margin contract **Need to think this through***
    function Margin(address _futureContract, uint _futureStart) {
        futureContract = _futureContract;
        futureStart = _futureStart;
    }


