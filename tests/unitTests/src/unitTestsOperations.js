import test from 'tape'
import FetchMock from 'fetch-mock'
import btc from 'bitcoinjs-lib'

import { estimateTXBytes, addUTXOsToFund, sumOutputValues,
         hash160, hash128, decodeB40 } from '../../../lib/operations/utils'

import { transactions, safety, config } from '../../../lib/'

const testAddresses = [
  { skHex: '85b33fdfa5efeca980806c6ad3c8a55d67a850bd987237e7d49c967566346fbd01',
    address: '1br553PVnK6F5nyBtb4ju1owwBKdsep5c' },
  { skHex: '744196d67ed78fe39009c71fbfd53e6ecca98353fbfe81ccba21b0703a69be9c01',
    address: '16xVjkJ3nY62B9t9q3N9wY6hx1duAfwRZR' },
  { address: '1HEjCcUjZXtbiDnCYviHLVZvSQsSZoDRFa',
    skHex: '12f90d1b9e34d8df56f0dc6754a97ab4a2eb962918c281b1b552162438e313c001' }
]

function utilsTests() {
  test('estimateTXBytes', (t) => {
    t.plan(2)
    let txHex = '010000000288e68977fab8038af07746e5d687652a44aa15f532509c202749d' +
        'bad8a418733000000006b483045022100813ef3534b5030b544e5a5bd1db93f85dc89e2' +
        'a565197a14784edff5564bd65b022008005213c6aa4c7ebe06cfd86bdaf3e662ae58371' +
        '896a0a841e81106fbe1507401210236b07942707a86ab666bb300b58d295d988ce9c3a3' +
        '38a0e08380dd98732fd4faffffffff3ba3edfd7a7b12b27ac72c3e67768f617fc81bc38' +
        '88a51323a9fb8aa4b1e5e4a000000006b483045022100d0c9b1594137186a1dc6c0b3a6' +
        'cbe08399b57e2b8c953584f2ce20bef5642eb902206b9c88b8d2d311db26601acf3068d' +
        'd118649ead4a1f93d029a52c0c61cb2cd2901210236b07942707a86ab666bb300b58d29' +
        '5d988ce9c3a338a0e08380dd98732fd4faffffffff030000000000000000296a2769643' +
        'f363da95bc8d5203d1c07bd87c564a1e6395826cfdfe87cfd31ffa2a3b8101e3e93096f' +
        '2b7c150000000000001976a91441577ec99314a293acbc17d8152137cf4862f7f188ace' +
        '8030000000000001976a9142ebe7b4729185f68c7185c3c6af60fad1b6eeebf88ac00000000'
    let tx = btc.Transaction.fromHex(txHex)
    tx.ins.forEach(x => x.script = null)

    let actualLength = txHex.length / 2
    let estimatedLength = estimateTXBytes(tx, 0, 0)

    let tx2 = new btc.TransactionBuilder()
    tx2.addOutput(tx.outs[0].script, 0)
    let estimatedLength2 = estimateTXBytes(tx2, 2, 2)

    t.ok(estimatedLength >= actualLength - 5 && estimatedLength <= actualLength + 5,
         `TX size estimate is roughly accurate? (estimated: ${estimatedLength}, actual: ${actualLength})`)
    t.ok(estimatedLength2 >= actualLength - 5 && estimatedLength2 <= actualLength + 5,
         `TX size estimate is roughly accurate? (estimated: ${estimatedLength2}, actual: ${actualLength})`)
  })

  test('encoding routines', (t) => {
    t.plan(5)

    t.equal(hash160(Buffer.from(
      '99999566ahjhqwuywqehpzlzlzlzl09189128921jkjlqjosq')).toString('hex'),
            '7ea1fa0f2003c31b015a72af9f4a5f104b5c2840')

    t.equal(hash160(Buffer.from('1234')).toString('hex'),
            'fd7a0d80999bedd76c9a0828057817fc6049a507')

    t.equal(hash128(Buffer.from('999')).toString('hex'),
            '83cf8b609de60036a8277bd0e9613575')

    t.equal(hash128(Buffer.from('99999566ahjhqwuywqehpzlzlzlzl09189128921jkjlqjosqaaa')).toString('hex'),
            '740ae7f18c939cf5e7c189a2c77a012f')

    t.equal(decodeB40('0123456789abcdefghijklmnopqrstuvwxyz-_.+0123456789abcdefghi' +
                      'jklmnopqrstuvwxyz-_.+0123456789abcdefghijklmnopqrstuvwxyz-_' +
                      '.+0123456789abcdefghijklmnopqrstuvwxyz-_.+0123456789abcdefg' +
                      'hijklmnopqrstuvwxyz-_.+'),
            '384a516059e707615a1992d3101f6f346df3326d03ea7b673e3754078895db48da2d0' +
            'fcb1bd89d618b0863bd8bac6db43a2d9cff5cc307310922d3cb8cf9c159d31c6a9c91' +
            '03197263a4e88f52d1b77dfc610e1b8dc9616ba6c2d0a1b792f0d73784c698c69f34a' +
            'e5e7900753627a3ac87529035fb1a6cba7ce2e1df590941cf30a44557')
  })

  test('not enough UTXOs to fund', (t) => {
    t.plan(1)

    let txB = new btc.TransactionBuilder()
    txB.addOutput(testAddresses[0].address, 10000)
    txB.addOutput(testAddresses[1].address, 0)

    const utxos = [{ value: 50000, tx_hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
                    tx_output_n: 0 }]

    t.throws(() => addUTXOsToFund(txB, 1, utxos, 60000, 10),
             /^Error: Not enough UTXOs to fund/,
             'Errors when not enough value to fund')

  })


  test('addUTXOsToFundSingleUTXO', (t) => {
    t.plan(2)

    let txB = new btc.TransactionBuilder()
    txB.addOutput(testAddresses[0].address, 10000)
    txB.addOutput(testAddresses[1].address, 0)

    const utxos = [{ value: 50000, tx_hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
                    tx_output_n: 0 }]

    txB = addUTXOsToFund(txB, 1, utxos, 10000, 10)

    t.equal(txB.tx.outs[1].value, 40000)
    t.equal(txB.tx.ins[0].hash.toString('hex'),
            Buffer.from(utxos[0].tx_hash, 'hex').reverse().toString('hex'))

  })

  test('addUTXOsToFundTwoUTXOs', (t) => {
    t.plan(3)

    let txB = new btc.TransactionBuilder()
    txB.addOutput(testAddresses[0].address, 10000)
    txB.addOutput(testAddresses[1].address, 0)

    const utxos = [{ value: 50000, tx_hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
                    tx_output_n: 0 },
                   { value: 10000, tx_hash: '3387418aaddb4927209c5032f515aa442a6587d6e54677f08a03b8fa7789e688',
                    tx_output_n: 0 }]

    txB = addUTXOsToFund(txB, 1, utxos, 55000, 10)

    t.ok(txB.tx.outs[1].value <= 5000, `${txB.tx.outs[1].value} should be less than 5k`)
    t.equal(txB.tx.ins[0].hash.toString('hex'),
            Buffer.from(utxos[0].tx_hash, 'hex').reverse().toString('hex'))
    t.equal(txB.tx.ins[1].hash.toString('hex'),
            Buffer.from(utxos[1].tx_hash, 'hex').reverse().toString('hex'))

  })

  test('modifiedTXSets', (t) => {
    t.plan(11)

    const txStarterHex = '01000000013ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a000000006a473044022050176492b92c79ba23fb815e62a7778ccb45a50ca11b8dabdbadc1828e6ba34002200ce77082a072eba8d3ce49e6a316e6173c1f97d955064574fe620cc25002eadb01210236b07942707a86ab666bb300b58d295d988ce9c3a338a0e08380dd98732fd4faffffffff030000000000000000296a2769643f363da95bc8d5203d1c07bd87c564a1e6395826cfdfe87cfd31ffa2a3b8101e3e93096f2be02c0000000000001976a91441577ec99314a293acbc17d8152137cf4862f7f188ac39050000000000001976a9142ebe7b4729185f68c7185c3c6af60fad1b6eeebf88ac00000000'
    const txStarter = btc.Transaction.fromHex(txStarterHex)

    const txHash = '22a024f16944d2f568de4a613566fcfab53b86d37f1903668d399f9a366883de'

    t.equal(txStarter.getHash().reverse().toString('hex'), txHash)

    let usedTXHash = '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'
    let utxoValues = [287825, 287825]
    let utxoSet1 = [{ value: utxoValues[0],
                     tx_hash_big_endian: usedTXHash,
                     tx_output_n: 0 },
                    { value: utxoValues[1],
                      tx_hash_big_endian: '3387418aaddb4927209c5032f515aa442a6587d6e54677f08a03b8fa7789e688',
                      tx_output_n: 0 }]
    let utxoSet2 = []

    config.network.modifyUTXOSetFrom(txStarterHex)

    let testAddress1 = '16xVjkJ3nY62B9t9q3N9wY6hx1duAfwRZR'
    let testAddress2 = '15GAGiT2j2F1EzZrvjk3B8vBCfwVEzQaZx'

    FetchMock.restore()

    FetchMock.get(`https://bitcoinfees.earn.com/api/v1/fees/recommended`, {fastestFee: 1000})

    FetchMock.get(`https://blockchain.info/unspent?format=json&active=${testAddress1}`,
                  {unspent_outputs: utxoSet1})
    FetchMock.get(`https://blockchain.info/unspent?format=json&active=${testAddress2}`,
                  {unspent_outputs: utxoSet2})

    Promise.all([config.network.getUTXOs(testAddress1),
                 config.network.getUTXOs(testAddress2)])
      .then( ([utxos1, utxos2]) => {
        t.equal( utxos1.length, 2 )
        t.equal( utxos2.length, 1 )
        t.ok( utxos1.find( x => x.tx_hash === txHash && x.value === 11488 ), "UTXO set should include the new transaction's outputs")
        t.ok( utxos2.find( x => x.tx_hash === txHash && x.value === 1337 ), "UTXO set should include the new transaction's outputs")
        t.ok( ! utxos1.find( x => x.tx_hash === usedTXHash ), "UTXO set shouldn't include the transaction's spent input")
      })
      .then( () => {
        config.network.resetUTXOs(testAddress1)
        config.network.resetUTXOs(testAddress2)
        return Promise.all([config.network.getUTXOs(testAddress1),
                            config.network.getUTXOs(testAddress2)])
      })
      .then( ([utxos1, utxos2]) => {
        t.equal( utxos1.length, 2 )
        t.equal( utxos2.length, 0 )
        t.ok( ! utxos1.find( x => x.tx_hash === txHash && x.value === 11488 ), "UTXO set should not include the new transaction's outputs after reset")
        t.ok( ! utxos2.find( x => x.tx_hash === txHash && x.value === 1337 ), "UTXO set should not include the new transaction's outputs after reset")
        t.ok( utxos1.find( x => x.tx_hash === usedTXHash ), "UTXO set should include the transaction's input after reset")
      })

  })
}

function transactionTests() {
  let utxoValues = [288000, 287825, 287825]
  let BURN_AMT = 6500
  let BURN_ADDR = '15GAGiT2j2F1EzZrvjk3B8vBCfwVEzQaZx'

  let utxoSet = [{ value: utxoValues[0],
                   tx_hash_big_endian: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
                   tx_output_n: 0 },
                 { value: utxoValues[1],
                   tx_hash_big_endian: '3387418aaddb4927209c5032f515aa442a6587d6e54677f08a03b8fa7789e688',
                   tx_output_n: 0 },
                 { value: utxoValues[2],
                   tx_hash_big_endian: 'ffffffffffdb4927209c5032f515aa442a6587d6e54677f08a03b8fa7789e688',
                   tx_output_n: 2 }]


  let utxoSet2 = [{ value: 5500,
                    tx_hash_big_endian: 'ffffffffaab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdedffff',
                    tx_output_n: 0 }]

  function setupMocks() {
    FetchMock.restore()
    FetchMock.get(`https://bitcoinfees.earn.com/api/v1/fees/recommended`, {fastestFee: 1000})
    FetchMock.get(`https://blockchain.info/unspent?format=json&active=${testAddresses[1].address}`,
                  {unspent_outputs: utxoSet})
    FetchMock.get(`https://blockchain.info/unspent?format=json&active=${testAddresses[0].address}`,
                  {unspent_outputs: utxoSet2})
    FetchMock.get(`https://core.blockstack.org/v1/prices/names/foo.test`,
                  { name_price: { satoshis: BURN_AMT }})
    FetchMock.get(`https://core.blockstack.org/v1/namespaces/test`,
                  { history: { 10: [{burn_address : BURN_ADDR}] } })
    FetchMock.get(`https://core.blockstack.org/v1/blockchains/bitcoin/consensus`,
                  { consensus_hash: 'dfe87cfd31ffa2a3b8101e3e93096f2b' })
  }

  function getInputVals(inputTX) {
    let utxos_all = utxoSet.concat()
    return inputTX.ins.reduce((agg, x) => {
      let inputTX = utxos_all.find(
        y => Buffer.from(y.tx_hash_big_endian, 'hex')
          .reverse().compare(x.hash) === 0 )
      if (inputTX) {
        return agg + inputTX.value
      } else {
        return agg
      }
    }, 0)
  }

  test('build and fund preorder', (t) => {
    t.plan(6)
    setupMocks()

    Promise.all(
      [transactions.estimatePreorder('foo.test',
                                     testAddresses[0].address,
                                     testAddresses[1].address),
       transactions.makePreorder('foo.test',
                                 testAddresses[0].address,
                                 testAddresses[1].skHex)])
      .then(([estimatedCost, hexTX]) => {
        t.ok(hexTX)
        let tx = btc.Transaction.fromHex(hexTX)
        let txLen = hexTX.length / 2
        let outputVals = sumOutputValues(tx)
        let inputVals = getInputVals(tx)
        let fee = inputVals - outputVals
        let burnAddress = btc.address.fromOutputScript(tx.outs[2].script)

        let change = tx.outs[1].value

        t.equal(inputVals - change, estimatedCost - 5500, 'Estimated cost should be +DUST_MINIMUM of actual.')
        t.equal(burnAddress, BURN_ADDR, `Burn address should be ${BURN_ADDR}`)
        t.equal(tx.outs[2].value, BURN_AMT, `Output should have funded name price ${BURN_AMT}`)
        t.equal(tx.ins.length, 1, 'Should use 1 utxo for the payer')
        t.ok(Math.floor(fee / txLen) > 990 && Math.floor(fee / txLen) < 1010,
             `Paid fee of ${fee} for tx of length ${txLen} should equal 1k satoshi/byte`)
      })
      .catch((err) => { console.log(err.stack); throw err })
  })

  test('build and fund register', (t) => {
    t.plan(4)
    setupMocks()

    Promise.all(
      [transactions.estimateRegister('foo.test',
                                     testAddresses[0].address,
                                     testAddresses[1].address, true, 2),
       transactions.makeRegister('foo.test',
                                 testAddresses[0].address,
                                 testAddresses[1].skHex, 'hello world')])
      .then(([estimatedCost, hexTX]) => {
        let tx = btc.Transaction.fromHex(hexTX)
        let txLen = hexTX.length / 2
        let outputVals = sumOutputValues(tx)
        let inputVals = getInputVals(tx)
        let fee = inputVals - outputVals

        // change address is the 3rd output usually...
        let change = tx.outs[2].value

        t.equal(btc.address.fromOutputScript(tx.outs[2].script), testAddresses[1].address,
                'Payer change should be third output')
        t.equal(inputVals - change, estimatedCost, 'Estimated cost should match actual.')
        t.equal(tx.ins.length, 2, 'Should use both payer utxos')
        t.equal(Math.floor(fee / txLen), 1000,
                `Paid fee of ${fee} for tx of length ${txLen} should equal 1k satoshi/byte`)
      })
      .catch((err) => { console.log(err.stack); throw err })
  })

  test('build and fund update', (t) => {
    t.plan(5)
    setupMocks()

    Promise.all(
      [transactions.estimateUpdate('foo.test',
                                     testAddresses[0].address,
                                     testAddresses[1].address,
                                     3),
       transactions.makeUpdate('foo.test',
                               testAddresses[0].skHex,
                               testAddresses[1].skHex,
                               'hello world')])
      .then(([estimatedCost, hexTX]) => {
        let tx = btc.Transaction.fromHex(hexTX)
        let txLen = hexTX.length / 2
        let outputVals = sumOutputValues(tx)
        let inputVals = getInputVals(tx)
        let fee = inputVals - outputVals

        // payer change address is the 3rd output...
        let changeOut = tx.outs[2]
        let ownerChange = tx.outs[1]
        let change = changeOut.value

        t.equal(btc.address.fromOutputScript(changeOut.script), testAddresses[1].address,
                'Owner change should be second output')
        t.equal(btc.address.fromOutputScript(ownerChange.script), testAddresses[0].address,
                'Payer change should be third output')
        t.equal(inputVals - change, estimatedCost, 'Estimated cost should match actual.')
        t.equal(tx.ins.length, 4, 'Should use all payer utxos and one owner utxo')
        t.ok(Math.floor(fee / txLen) > 990 && Math.floor(fee / txLen) < 1010,
             `Paid fee of ${fee} for tx of length ${txLen} should roughly equal 1k satoshi/byte`)
      })
      .catch((err) => { console.log(err.stack); throw err })
  })

  test('build and fund transfer', (t) => {
    t.plan(6)
    setupMocks()

    Promise.all(
      [transactions.estimateTransfer('foo.test',
                                    testAddresses[2].address,
                                    testAddresses[0].address,
                                    testAddresses[1].address,
                                    3),
       transactions.makeTransfer('foo.test',
                                 testAddresses[2].address,
                                 testAddresses[0].skHex,
                                 testAddresses[1].skHex)])
      .then(([estimatedCost, hexTX]) => {
        let tx = btc.Transaction.fromHex(hexTX)
        let txLen = hexTX.length / 2
        let outputVals = sumOutputValues(tx)
        let inputVals = getInputVals(tx)
        let fee = inputVals - outputVals

        // payer change address is the 4th output...
        let changeOut = tx.outs[3]
        // old owner change address is the 3rd output
        let ownerChange = tx.outs[2]

        let change = changeOut.value

        t.equal(btc.address.fromOutputScript(tx.outs[1].script), testAddresses[2].address,
                'New owner should be second output')
        t.equal(btc.address.fromOutputScript(ownerChange.script), testAddresses[0].address,
                'Prior owner should be third output')
        t.equal(btc.address.fromOutputScript(changeOut.script), testAddresses[1].address,
                'Payer change should be fourth output')
        t.equal(inputVals - change, estimatedCost, 'Estimated cost should match actual.')
        t.equal(tx.ins.length, 4, 'Should use both payer utxos and one owner utxo')
        t.ok(Math.floor(fee / txLen) > 990 && Math.floor(fee / txLen) < 1010,
             `Paid fee of ${fee} for tx of length ${txLen} should roughly equal 1k satoshi/byte`)
      })
      .catch((err) => { console.log(err.stack); throw err })
  })

  test('build and fund renewal', (t) => {
    t.plan(7)
    setupMocks()

    Promise.all(
      [transactions.estimateRenewal('foo.test',
                                    testAddresses[2].address,
                                    testAddresses[0].address,
                                    testAddresses[1].address,
                                    true,
                                    3),
       transactions.makeRenewal('foo.test',
                                testAddresses[2].address,
                                testAddresses[0].skHex,
                                testAddresses[1].skHex,
                                'hello world')])
      .then(([estimatedCost, hexTX]) => {
        let tx = btc.Transaction.fromHex(hexTX)
        let txLen = hexTX.length / 2
        let outputVals = sumOutputValues(tx)
        let inputVals = getInputVals(tx)
        let fee = inputVals - outputVals

        // payer change address is the 5th output...
        let changeOut = tx.outs[4]
        // old owner change address is the 3rd output
        let ownerChange = tx.outs[2]

        let change = changeOut.value

        t.equal(btc.address.fromOutputScript(tx.outs[1].script), testAddresses[2].address,
                'New owner should be second output')
        t.equal(btc.address.fromOutputScript(ownerChange.script), testAddresses[0].address,
                'Prior owner should be third output')
        t.equal(btc.address.fromOutputScript(tx.outs[3].script), BURN_ADDR,
                'Burn address should be fourth output')
        t.equal(btc.address.fromOutputScript(changeOut.script), testAddresses[1].address,
                'Payer change should be fifth output')
        t.equal(inputVals - change, estimatedCost, 'Estimated cost should be accurate.')
        t.equal(tx.ins.length, 4, 'Should use both payer utxos and one owner utxo')
        t.ok(Math.floor(fee / txLen) > 990 && Math.floor(fee / txLen) < 1010,
             `Paid fee of ${fee} for tx of length ${txLen} should roughly equal 1k satoshi/byte`)
      })
      .catch((err) => { console.log(err.stack); throw err })
  })
}

function safetyTests() {
  test('addCanReceiveName', (t) => {
    t.plan(2)
    FetchMock.restore()
    FetchMock.get(`https://core.blockstack.org/v1/addresses/bitcoin/${testAddresses[1].address}`,
                  ['dummy.id','dummy.id','dummy.id'])
    const namesTooMany = new Array(25)
    namesTooMany.fill('dummy.id')
    FetchMock.get(`https://core.blockstack.org/v1/addresses/bitcoin/${testAddresses[0].address}`,
                  namesTooMany)

    Promise.all([safety.addressCanReceiveName(testAddresses[0].address),
                 safety.addressCanReceiveName(testAddresses[1].address)])
      .then(([t0, t1]) => {
        t.ok(t1, 'Test address ${testAddresses[1].address} should not have too many names.')
        t.ok(!t0, 'Test address ${testAddresses[0].address} should have too many names.')
      })
  })

  test('ownsName', (t) => {
    t.plan(2)
    FetchMock.restore()
    FetchMock.get(`https://core.blockstack.org/v1/names/foo.test`,
                  {'address': testAddresses[0].address})

    Promise.all([safety.ownsName('foo.test', testAddresses[0].address),
                 safety.ownsName('foo.test', testAddresses[1].address)])
      .then(([t0, t1]) => {
        t.ok(t0, 'Test address ${testAddresses[0].address} should own foo.test')
        t.ok(!t1, 'Test address ${testAddresses[1].address} should not own foo.test')
      })
  })

  test('nameInGracePeriod', (t) => {
    t.plan(4)
    FetchMock.restore()

    FetchMock.get(`https://core.blockstack.org/v1/names/bar.test`,
                  {body: 'Name available', status: 404})
    FetchMock.get(`https://core.blockstack.org/v1/names/foo.test`,
                  {expires_block: 50})
    FetchMock.getOnce(`https://blockchain.info/latestblock`,
                      {height: 49})
    safety.isInGracePeriod('foo.test')
      .then(result => {
        t.ok(!result, 'name should not be in grace period if it isnt expired')
        FetchMock.getOnce(`https://blockchain.info/latestblock`,
                          {height: 50})
        return safety.isInGracePeriod('foo.test')
      })
      .then(result => {
        t.ok(result, 'name should be in grace period')
        FetchMock.get(`https://blockchain.info/latestblock`,
                      {height: 5050})
        return safety.isInGracePeriod('foo.test')
      })
      .then(result => {
        t.ok(!result, 'grace period should have passed')
        return safety.isInGracePeriod('bar.test')
      })
      .then(result => {
        t.ok(!result, 'bar.test isnt registered. not in grace period')
      })
  })

  test('nameAvailable', (t) => {
    t.plan(2)
    FetchMock.restore()
    FetchMock.get(`https://core.blockstack.org/v1/names/foo.test`,
                  {body: 'Name available', status: 404})
    FetchMock.get(`https://core.blockstack.org/v1/names/bar.test`,
                  {'address': testAddresses[0].address})

    Promise.all([safety.isNameAvailable('foo.test'),
                 safety.isNameAvailable('bar.test')])
      .then(([t0, t1]) => {
        t.ok(t0, 'foo.test should be available')
        t.ok(!t1, 'bar.test isnt available')
      })
  })

  test('nameValid', (t) => {
    t.plan(11)

    let shouldFail = [
      { name: '123456789012345678901234567890.1234567',
        reason: 'is too long' },
      { name: '1234567890123456789012345678901234567',
        reason: 'has no namespace' },
      { name: '1.2.3',
        reason: 'is a subdomain' },
      { name: null,
        reason: 'is null' },
      { name: '.43',
        reason: 'has no name' },
      { name: '43#43.xyz',
        reason: 'illegal character' },
      { name: '43 43.xyz',
        reason: 'illegal character' }]
      .map( x => {
        safety.isNameValid(x.name).then(
          passed => t.ok(!passed, `${x.name} should fail for: ${x.reason}`))
      })

    let shouldPass = ['abc123.id', 'abcd123.1',
                  '123456789012345678901234567890.123456',
                  'abc_+-123.id']
      .map( x => {
        safety.isNameValid(x).then(
          passed => t.ok(passed, `${x} should pass`))
      })

    Promise.all(shouldPass)
      .then(() => Promise.all(shouldFail))
  })
}


export function runOperationsTests() {
  utilsTests()
  transactionTests()
  safetyTests()
}