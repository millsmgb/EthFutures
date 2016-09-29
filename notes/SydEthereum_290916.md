Devcon Debrief
==============

##Attendees

 - Gavin Wood was not there

## Thoughts and Impressions

 - Want to replace the internet
    - Replace client/server style set up
 - Ethereum going from infant stage to toddler stage
 - Core blockchain is still maturing
    - Most advanced applications is still being thought up/being put together

## Conference Itself

 - Too many talks
    - Lots of companies showing off ideas
    - Had to cut things short too much

Web3
=====

##Web 1.0 -> Web 2.0 -> Web 3.0

 - Web 1.0
    - Really basic and maintaned by keen beans
 - Web 2.0 
    - Advertising
 - Web 3.0
    - Publish application in peer-to-peer Ether
    - Entirely decentralised applications
    - Not applicable to everything but still cool

##Swarm - IPFS

 - Distributed storage of *object collections*
 - Incorporates:
    - Content addressable storage
    - Storage incentive system
    - Scales according to demand
 - Swarm is the Ethereum community's IPFS implementation
 - Using ETH to incentivise storage ensures that my files will live in the peer-to-peer space
 - One use case is with bandwith requirements
    - Store content based on level of rewards
    - Incentivisation of storage of popular websites
 - SWARM provides the connection between the user interface and the smart contract

##Whisper

 - Direct communication protocol for DApps
 - A way for decentralised applications to talk to each other pseudo-realtime
 - Allows for communication without any storage on the blockchain
 - Was not discussed in Devcon2 but going to be a thing
    - More focus on Swarm at this point

##Ethereum

 - Persistent storage
 - Where Swarm is all static, Ethereum is the web equivalent of the database
 - Identity is a big component of the Ethereum system
    - In the traditional web, our identity is tied to the service we are using - e.g. AirBnB login
    - In Ethereum, my identity is my private key, and we interact with others with our public key

##Example is a Distributed Photo Album

 - All web app and photo data is stored on Swarm
 - Latest pointers is stored on the blockchain
 - Apply long-term incentives to prevent SWARM auto garbage collection
 - High performance regardless of popularity
 - An example might be thumbnails/blurred backgrounds?
    - **Delegated Computation**
    - **Input:** data + specification + proof
    - **Output:** result + proof
    - Provides an incentive structure to encourage others to publish proofs and results in order to get paid for computations

State Channels
==============

##Why State Channels?

 - How do you realistically replace existing web structure?
    - Need a feasible way of accessing and pay for data
 - Ethereum is currently too slow and expensive to do this

##Introducing State Channels

 - Do arbitrary transactions that are as secure as they would be on the blockchain, without doing it on the blockchain
 - Create a smart contract acting as a judge
    - For example 2 people put in an equal amount of ETH, and the judge (the smart contract) will recognise this
 - A promise is an agreement for a transaction with an expiry time
 - Each promise is signed by each party (off blockchain) 
 - After an arbitary number of transactions, a party can send the final state to the judge to be recorded in the blockchain and end the channel
 - Therefore many many transactions can still be done, in a trustless manner
    - The judge can receive proofs from both parties, and therefore if one party is a bad actor, the other will catch them out
 - Benefits
    - Transactions can happen in real time
    - Very little or no transaction fees
    - Game theoretic
    - Scalable due to the ability to extend this concept to an arbitary number of participants
        - A mesh network may be one end result
 - Example implementation is Raiden
 - SWARM is a user of this kind of concept

Regulatory Considerations
=========================

##Coin Center

 - Aims to be equivalent to the EFF in the early days of the internet 

##US SEC

 - Push for extradition if you break their laws
 - Having a single US customer/token holder makes you subject to their regulations
 - Severe penalties apply for anyone deemed a promoter of an unregisted security
    - Possible ETH?
 - Already investigating PayCoin
 - Paying attention to the DAO
 - All things can be considered securities
    - language has a significant impact on whether your token falls under US securities regulation

##Avoid the Traps

 - **Security**
    - Language: Initial Coin Offering
    - Language: Profit Sharing
 - **Not a security**
    - Token purchased for use-value rather than profit expectation
    - Token purchased *after* the application is already up and running

Zcash
=====

 - Privacy-preserving cryptocurrency whose genesis block is one month away
 - Fork of Bitocin
 - Based on Zerocoin (2013) as an addon to the Bitcoin protocol
 - Built on Zerocoin to come up with Zerocash
 - This Zerocash paper was implemented Zcash (2016)
 - ZK-Snarks
 - Use of Equihash proof-of-work algorithm
    - Birthday problem 
    - Memory hardened
           - Considerable amount of memory required to compute
    - GPU and ASIC resistance
          - GPU 30x improvement from some early reports
 - Three options
    - Add Zk-SNARKS to Ethereum
    - Add smart contracts to Zcash
    - Project Alchemy:

Ethereum Name Service
=====================

 - Name Services:
    - ETH registrar pointing to resolvers 
 - Governance issues?
    - First come, first served?
 - Interim release end of this year
 - Only .eth domains and greater than 7 characters
 - Hope to accept permanent registrars by Nov 2017

Ethereum Light Client
=====================

 - Light client already implemented in public beta
 - Written by one guy atm
 - Can be used by Smart Watches
 - Big IoT push
 - RLP v5 advertise capabilities via topics

Future of Mist
=============

 - New browser
 - Worry about all the content on SWARM and provide user interaction with Dapp
 - Allows for various back-ends
 - ERC67 new URIs - ethereum://address&function
 - Build new web like roads
    - Roads: Anyone can use and repair
    - Rails: Only for use and maintanance by owner

Web3j
=====

 - Code - github.com/web3j/web3j
 - gitter.im/web3j
