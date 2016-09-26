pragma solidity ^0.4.0;

/*
 * A contract for difference is a contract where the difference in value is paid 
 * for the security over the course of the duration of the contract. In this 
 * case, the difference is marked to market daily until either a margin call occurs
 * or the CFD complete - an example is that if A goes short and B goes long, if the
 * value of the underlying security increases, A must pay B the difference and vice-versa
 */

contract ContractForDifference {

    // Address for both short and long positions for the CFD
    public address short;
    public address long;

    // Address for both short and long margin accounts for the CFD
    private address shortMargin;
    private address longMargin;

    // Start and end times for the CFD
    private uint startTime;
    private uint endTime;

    // Price Ticker Value
    public uint currETHUSD;
    public uint prevETHUSD;
    
    // Address of Oracle
    public address oracleETHUSD;
