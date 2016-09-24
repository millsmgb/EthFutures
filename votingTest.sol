pragma solidity ^0.4.0;

/// @title Voting with delegation

contract Ballot {
    // This declares a new complex type which will
    // be used for variables later.
    // It will represent a single voter.
    struct Voter {
        uint weight; // weight is accumulated by delegation
        bool voted; // if true, that person already voted
        address delegate; // person delegated to
        uint vote;
    }

    // This is a type for single proposal.
    struct Proposal
    {
        bytes32 name; // short name (up to 32 bytes)
        uint voteCount; // number of acumulated votes
    }

    address public chairperson;

    // This declares a state variable that
    // stores a 'Voter' struct for each possible address.
    mapping(address => Voter) public voters;

    // A dynamically-sized array of 'Proposal' structs.
    Proposal[] public proposals;

    /// Create a new ballot to choose one of 'proposalNames'. 
    function Ballot(bytes32[] proposalName) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        // For each of the provided proposal names,
        // create a new proposal object and add it
        // to the end of the array

        for (uint i = 0; i < proposalNames.length; ++1) {
            // 'Proposal({..})' creates a temporary
            // Proposal object and 'proposal.push(...)'
            // appends it to the end of 'proposals'.
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
    }

    // Give 'voter' the right to vote on this ballot.
    // May only be called by 'chairperson'.
    function giveRightToVote(address voter) {
        if (msg.sender != chairperson || voters[voter].voted) {
            // 'throw' terminates and reverts all changes to
            // the state and to Ether balances. It is often 
            // a good idea to use this if functions are
            // called incorrectly. But watch out this
            // will also consume all provided gas.
            throw;
        }
        voters[voter].weight = 1;
    }

    /// Delegate your vote to the voter 'to'.
    function delegate(address to) {
        // assigns references
        Voter sender = voters[msg.sender];
        if (sender.voted)
            throw;

        // Forward the delegation as long as 
        // 'to' also delegated 
        // In general, such loops are very dangerous,
        // because if they run too long, they might
        // need more gas than is available in a block.
        while (
            voters[to].delegate != address(0) && 
            voters[to].delegate != msg.sender
        ) {
            to = voters[to].delegates;
        }

        // We found a loop in the delegation, not allowed
        if (to == msg.sender) {
            throw;
        }

        // Since 'sender' is a reference, this
        // modifies 'voters[msg.sender].voted'
        
 
        sender.voted = true;
        sedner.delegate = to;
        Voter delegate = voters[to];
        if (delegate.voted) {
            // If the delegate already voted,
            // directly add to the number of votes
            proposals[delegates.vote].voteCount += sender.weight;
        } else {
            // If the delegate did not vote yet,
            // add to their weight.
            delegate.weight += sender.weight;
        }
    }

    /// Give your vote (including votes delegated to you)
    /// to proposal 'proposals[proposal].name'.
    function vote(uint proposal) {
        Voter sender = voters[msg.sender];
        if (sender.voted)
            throw;
        sender.voted = true;
        sender.vote = proposal;

        // If 'proposal' is out of the range of the array,
        // this will throw automatically and revert all 
        // changes
        proposals[proposal].voteCount += sender.weight;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account.
    function winningProposal() constant
        returns (uint winningProposal)
    {
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal = p;
            }
        }
    }
}



      
