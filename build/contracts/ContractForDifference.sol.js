var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("ContractForDifference error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("ContractForDifference error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("ContractForDifference contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of ContractForDifference: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to ContractForDifference.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: ContractForDifference not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "oracleETHUSD",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "liquidateLong",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "withdrawAmount",
            "type": "uint256"
          }
        ],
        "name": "withdraw",
        "outputs": [
          {
            "name": "remainingBal",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "currPrice",
            "type": "uint256"
          }
        ],
        "name": "mark",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "deposit",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isTerminated",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "liquidateShort",
        "outputs": [],
        "type": "function"
      },
      {
        "inputs": [],
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "CFDMarkShort",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "CFDMarkLong",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "accountAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "updatedMargin",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405260018054600160a060020a03191633178155600280549182018082559091908281838015829011610056576000838152602090206100569181019083015b8082111561014a5760008155600101610042565b5050506000928352506001546020909220018054600160a060020a031916600160a060020a03909216919091179055604051610ebb8061014e833901809050604051809103906000f0600460006101000a815481600160a060020a0302191690830217905550600460009054906101000a9004600160a060020a0316600160a060020a03166398d5fdca604051817c01000000000000000000000000000000000000000000000000000000000281526004018090506020604051808303816000876161da5a03f11561000257505060405151600355506004805460a060020a60ff021916905561070a806110096000396000f35b509056606060405260028054600160a060020a031916331790556100747f110000000000000000000000000000000000000000000000000000000000000060008054600160a060020a0316141561016e5761016c60005b60006000610282731d3b2638a7cc9f2cb3d298a3da7a90b67e5506ed5b3b90565b61015e61025861027581604060405190810160405280600381526020017f55524c0000000000000000000000000000000000000000000000000000000000815260200150608060405190810160405280604c81526020017f6a736f6e2868747470733a2f2f6170692e6b72616b656e2e636f6d2f302f707581526020017f626c69632f5469636b65723f706169723d455448555344292e726573756c742e81526020017f58455448585553442e632e300000000000000000000000000000000000000000815260200150600080548190600160a060020a03168114156103b7576103b56000610053565b61085c8061065f6000396000f35b505b600060009054906101000a9004600160a060020a0316600160a060020a03166338cc4831604051817c01000000000000000000000000000000000000000000000000000000000281526004018090506020604051808303816000876161da5a03f11561000257505060408051805160018054600160a060020a031916909117908190557f688dcfd70000000000000000000000000000000000000000000000000000000082527fff00000000000000000000000000000000000000000000000000000000000000851660048301529151600160a060020a0392909216925063688dcfd7916024808301926000929190829003018183876161da5a03f1156100025750505050565b5050565b5060005b919050565b11156102b6575060008054600160a060020a031916731d3b2638a7cc9f2cb3d298a3da7a90b67e5506ed179055600161027d565b60006102d5739efbea6358bed926b293d2ce63a730d6d98d43dd610070565b111561030c575060008054739efbea6358bed926b293d2ce63a730d6d98d43dd600160a060020a031991909116179055600161027d565b600061032b7320e12a1f859b3feae5fb2a0a32c18f5a65555bbf610070565b11156103625750600080547320e12a1f859b3feae5fb2a0a32c18f5a65555bbf600160a060020a031991909116179055600161027d565b6000610381739a1d6e5c6c8d081ac45c6af98b74a42442afba60610070565b1115610279575060008054600160a060020a031916739a1d6e5c6c8d081ac45c6af98b74a42442afba60179055600161027d565b505b600060009054906101000a9004600160a060020a0316600160a060020a03166338cc4831604051817c01000000000000000000000000000000000000000000000000000000000281526004018090506020604051808303816000876161da5a03f115610002575050604051805160018054600160a060020a031916909117908190557f524f388900000000000000000000000000000000000000000000000000000000825260206004838101828152895160248601528951600160a060020a0394909416955063524f3889948a949193849360449290920192868201929091829185918391869160009190601f850104600302600f01f150905090810190601f1680156104d85780820380516001836020036101000a031916815260200191505b50925050506020604051808303816000876161da5a03f11561000257505060405151915050670de0b6b3a764000062030d403a020181111561052157600091505b509392505050565b600160009054906101000a9004600160a060020a0316600160a060020a031663adf59f9982878787604051857c01000000000000000000000000000000000000000000000000000000000281526004018084815260200180602001806020018381038352858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156105d85780820380516001836020036101000a031916815260200191505b508381038252848181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156106315780820380516001836020036101000a031916815260200191505b509550505050505060206040518083038185886185025a03f11561000257505060405151935061051991505056606060405260e060020a600035046338bbfa50811461004757806341c0e1b51461010e57806373db08441461013557806382ab890a1461013e57806398d5fdca14610229575b005b60408051602060248035600481810135601f81018590048502860185019096528585526100459581359591946044949293909201918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a01909352828252969897606497919650602491909101945090925082915084018382808284375094965050505050505061024560008054600160a060020a03168114156103415761033f60005b60006000610690731d3b2638a7cc9f2cb3d298a3da7a90b67e5506ed5b3b90565b610045600254600160a060020a039081163390911614156103395733600160a060020a0316ff5b61023360035481565b6100456004355b61033b81604060405190810160405280600381526020017f55524c0000000000000000000000000000000000000000000000000000000000815260200150608060405190810160405280604c81526020017f6a736f6e2868747470733a2f2f6170692e6b72616b656e2e636f6d2f302f707581526020017f626c69632f5469636b65723f706169723d455448555344292e726573756c742e81526020017f58455448585553442e632e300000000000000000000000000000000000000000815260200150600080548190600160a060020a031681141561041b5761041960006100ed565b6102336003545b90565b60408051918252519081900360200190f35b600160a060020a031633600160a060020a031614151561026457610002565b6103268260006104118260006040805160208101909152600090819052828180805b835181101561030857603060f860020a028482815181101561000257016020015160f860020a9081900402600160f860020a031916108015906102f35750603960f860020a028482815181101561000257016020015160f860020a9081900402600160f860020a03191611155b156107cb57811561082c578560001415610823575b600086111561031b57600a86900a909202915b509095945050505050565b600355610334610258610145565b505050565b565b5050565b505b600060009054906101000a9004600160a060020a0316600160a060020a03166338cc48316040518160e060020a0281526004018090506020604051808303816000876161da5a03f11561000257505060408051805160018054600160a060020a031916909117908190557fc281d19e0000000000000000000000000000000000000000000000000000000082529151600160a060020a0392909216925063c281d19e91600482810192602092919082900301816000876161da5a03f1156100025750506040515191506102309050565b90505b919050565b505b600060009054906101000a9004600160a060020a0316600160a060020a03166338cc48316040518160e060020a0281526004018090506020604051808303816000876161da5a03f115610002575050604051805160018054600160a060020a031916909117908190557f524f388900000000000000000000000000000000000000000000000000000000825260206004838101828152895160248601528951600160a060020a0394909416955063524f3889948a9491938493604490920192868201929091829185918391869160009190601f850104600302600f01f150905090810190601f1680156105225780820380516001836020036101000a031916815260200191505b50925050506020604051808303816000876161da5a03f11561000257505060405151915050670de0b6b3a764000062030d403a020181111561056b57600091505b509392505050565b600160009054906101000a9004600160a060020a0316600160a060020a031663adf59f99828787876040518560e060020a0281526004018084815260200180602001806020018381038352858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156106095780820380516001836020036101000a031916815260200191505b508381038252848181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156106625780820380516001836020036101000a031916815260200191505b509550505050505060206040518083038185886185025a03f115610002575050604051519350610563915050565b11156106c4575060008054600160a060020a031916731d3b2638a7cc9f2cb3d298a3da7a90b67e5506ed1790556001610414565b60006106e3739efbea6358bed926b293d2ce63a730d6d98d43dd61010a565b111561071a575060008054739efbea6358bed926b293d2ce63a730d6d98d43dd600160a060020a0319919091161790556001610414565b60006107397320e12a1f859b3feae5fb2a0a32c18f5a65555bbf61010a565b11156107705750600080547320e12a1f859b3feae5fb2a0a32c18f5a65555bbf600160a060020a0319919091161790556001610414565b600061078f739a1d6e5c6c8d081ac45c6af98b74a42442afba6061010a565b11156107c3575060008054600160a060020a031916739a1d6e5c6c8d081ac45c6af98b74a42442afba601790556001610414565b506000610414565b8381815181101561000257016020015160f860020a9081900402600160f860020a0319167f2e00000000000000000000000000000000000000000000000000000000000000141561081b57600191505b600101610286565b60001995909501945b600a83029250825060308482815181101561000257016020015160f860020a90819004810204039092019161081b566060604052361561006c5760e060020a60003504630f600e0081146100745780632d9491a9146100865780632e1a7d4d1461017a5780638da5cb5b1461021d578063b69766c21461022f578063d0e30db01461024f578063d1cc99761461026c578063e592f92b1461027f575b610372610002565b610374600454600160a060020a031681565b6103725b600280546000918291600190811015610002576000918252602080832090910154600160a060020a03168352820192909252604001812054600280549192918291908290811015610002579060005260206000209001600090546101009190910a9004600160a060020a031681526020810191909152604001600090812080549092019091556002805482918291600190811015610002579060005260206000209001600090546101009190910a9004600160a060020a031681526020810191909152604001600020556004805474ff0000000000000000000000000000000000000000191660a060020a179055565b61039160043533600160a060020a03166000908152602081905260408120548290106101ff576040808220805484900390555133600160a060020a0316908290849082818181858883f1935050505015156101ff57816000600050600033600160a060020a031681526020019081526020016000206000828282505401925050819055505b505033600160a060020a031660009081526020819052604090205490565b610374600154600160a060020a031681565b61037260043560045460009060a060020a900460ff16156103b757610002565b61039160045460009060a060020a900460ff161561060d57610002565b6103a360045460a060020a900460ff1681565b6103725b6002805460009182918290811015610002576000918252602080832090910154600160a060020a0316835282019290925260400181205460028054919291829190600190811015610002579060005260206000209001600090546101009190910a9004600160a060020a0316815260208101919091526040016000908120805490920190915560028054829182918290811015610002579060005260206000209001600090546101009190910a9004600160a060020a031681526020810191909152604001600020556004805474ff0000000000000000000000000000000000000000191660a060020a179055565b005b60408051600160a060020a03929092168252519081900360200190f35b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b50600280546003548303918291600091829182908110156100025750507f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace54600160a060020a03169052602081905260409020541161041857610476610283565b80600060005060006002600050600181548110156100025750507f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5acf54600160a060020a03169052602081905260409020541161047b5761047661008a565b610609565b806000600050600060026000506000815481101561000257507f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace54600160a060020a0316825260208290526040822080548590039055805460019081101561000257507f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5acf54600160a060020a0316825260408220805494909401909355600385905582547f7c5c6b5a1df059e329bc26d50f5c1d121c84d5fad3b918e01f4edbe2b3e8e60893925081101561000257527f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace5460408051600160a060020a03929092168252602082018490528051918290030190a17f7c5c6b5a1df059e329bc26d50f5c1d121c84d5fad3b918e01f4edbe2b3e8e6086002600050600181548110156100025750604080516000929092527f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5acf54600160a060020a03168252602082018490528051918290030190a15b5050565b6002805460018101808355828183801582901161064b5760008381526020902061064b9181019083015b808211156106865760008155600101610637565b505050600092835250602090912001805473ffffffffffffffffffffffffffffffffffffffff19163317905560028054111561068a57610002565b5090565b33600160a060020a03166000818152602081815260409182902080543490810190915582519384529083015280517f7c5c6b5a1df059e329bc26d50f5c1d121c84d5fad3b918e01f4edbe2b3e8e6089281900390910190a16000600050600033600160a060020a031681526020019081526020016000206000505490509056",
    "events": {
      "0x0c55b5ac44f1a27e64dd734e429026561d317c07216ec0ef8b1676a53b425a09": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "CFDMarkShort",
        "type": "event"
      },
      "0x94f6fc4ba6ddc216703ac0a6699567bcb45f9f9132b2508032309e614c54bf7b": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "CFDMarkLong",
        "type": "event"
      },
      "0x7c5c6b5a1df059e329bc26d50f5c1d121c84d5fad3b918e01f4edbe2b3e8e608": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "accountAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "updatedMargin",
        "type": "event"
      }
    },
    "updated_at": 1477150767464
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "ContractForDifference";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.ContractForDifference = Contract;
  }
})();
