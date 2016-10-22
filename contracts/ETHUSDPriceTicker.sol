/* 
 * Contract for Oracle price based on the example Price Ticker contract
 * found on the Oraclize documentation
 * https://github.com/oraclize/ethereum-examples/solidity/KrakenPriceTicker.sol
 */

// Import the Oraclize API
import "usingOraclize.sol";

contract ETHUSDPriceTicker is usingOraclize {

    address owner;
    uint public ETHUSD;

    function ETHUSDPriceTicker() {
        owner = msg.sender;
        oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
        update(600);
    }

    function __callback(bytes32 myid, string result, bytes proof) {
        if (msg.sender != oraclize_cbAddress())
            throw;
        ETHUSD = parseInt(result); // Current ETHUSD exchange rate
        update(600); // Schedule next update in 10 minutes
    }

    function update(uint delay) {
        oraclize_query(delay, "URL", "json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHXUSD.c.0");
    }

    function getPrice() public returns (uint price) {
        return ETHUSD;
    }

    function kill() {
        if (msg.sender == owner) suicide(msg.sender);
    }
}
