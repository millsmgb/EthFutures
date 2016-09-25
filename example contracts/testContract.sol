init:
	contract.storage[0] = msg.data[0] # Limited account
	contract.storage[i] = msg.data[1] # Unlimited account
	contract.storage[2] = block.timestamp # Time last accessed

code:
	if msg.sender = contract.storage[0]:
		last_accessed = contract.storage[2]
		balance_avail = contract.storage[3]

        #withdrawal limit is 1 finney per second, maximum 10000 ether
        balance_avail += 10^15 *         
