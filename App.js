import './App.css';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';
const myAlgoWallet = new MyAlgoConnect();


function App() {


  const algodClient = new algosdk.Algodv2('', 'https://api.testnet.algoexplorer.io', '');
  const myAlgoConnect = new MyAlgoConnect();


  const waitForConfirmation = async function (algodclient, txId) {
    let status = (await algodclient.status().do());
    let lastRound = status["last-round"];
      while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
          //Got the completed Transaction
          console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
          break;
        }
        lastRound++;
        await algodclient.statusAfterBlock(lastRound).do();
      }
    };




  const send = async () => {
    try {
      const accounts = await myAlgoWallet.connect();
      const addresses = accounts.map(account => account.address);
      const params = await algodClient.getTransactionParams().do();

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams: {
          ...params,
      },
      from: addresses[0],
      to: "EGUSS7HHM3ODVPW3Z2L55WPCZCR4TWSN2VVAKYPZKYEUER5BXM5N6YNH7I", 
      amount: 1,
      note: undefined
  });
  
  const myAlgoConnect = new MyAlgoConnect();
  const signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  const response = await algodClient.sendRawTransaction(signedTxn.blob).do();
  console.log("TxID", JSON.stringify(response, null, 1));
    } catch (err) {
      console.error(err);
    }
  }

  const Atomic = async () => {
    try {
      const accounts = await myAlgoWallet.connect();
      const addresses = accounts.map(account => account.address);
      const params = await algodClient.getTransactionParams().do();

      const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams: {
            ...params,
        },
        from: addresses[0],
        to: "ZAAHQ7DV7745I5WXAQPXL4GI4ASAV3KWSWM2IJF3UBWJLEDBDISXY2MCT4", 
        amount: 1
    });
    
    const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams: {
            ...params,
        },
        from: addresses[0],
        to: "EGUSS7HHM3ODVPW3Z2L55WPCZCR4TWSN2VVAKYPZKYEUER5BXM5N6YNH7I", 
        amount: 1
    });
    
    const txnsToGroup = [ txn1, txn2 ];
    const groupID = algosdk.computeGroupID(txnsToGroup)
    for (let i = 0; i < 2; i++) txnsToGroup[i].group = groupID;
    

    const signedTxns = await myAlgoConnect.signTransaction(txnsToGroup.map(txn => txn.toByte()));
  const response = await algodClient.sendRawTransaction(signedTxns.map(tx => tx.blob)).do();
  console.log("TxID", JSON.stringify(response, null, 1));
  await waitForConfirmation(algodClient, response.txId);
    } catch (err) {
      console.error(err);
    }
  }

  const AtomicLsig = async () => {
    try {
      const accounts = await myAlgoWallet.connect();
      const addresses = accounts.map(account => account.address);
      const params = await algodClient.getTransactionParams().do();

      let data = ``;
      let results = await algodClient.compile(data).do();
      console.log("Hash = " + results.hash);
      console.log("Result = " + results.result);

      let program = new Uint8Array(Buffer.from(results.result, "base64"));

      let args = [];
      args.push(algosdk.encodeUint64(123));

      const lsig = algosdk.makeLogicSig(program, args);
    
      const tx1 = {
          ...params,
          flatFee: true,
          fee: 1000,
          type: "pay",
          from: addresses[0],
          to: lsig.address(),
          amount: 0,
      };
      
      const tx2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          suggestedParams: params,
          from: lsig.address(),
          to: addresses[0],
          amount: 0,
          note: undefined,
      });
      
      const groupID = algosdk.computeGroupID([ tx1, tx2 ]);
      const txs = [ tx1, tx2 ];
      txs[0].group = groupID;
      txs[1].group = groupID;
      
      const signedTx1 = await myAlgoConnect.signTransaction(txs[0]);
      const signedTx2 = algosdk.signLogicSigTransaction(txs[1], lsig);
  const response = await algodClient.sendRawTransaction([ signedTx1.blob, signedTx2.blob ]).do();
  console.log("TxID", JSON.stringify(response, null, 1));
  await waitForConfirmation(algodClient, response.txId);
    } catch (err) {
      console.error(err);
    }
  }


  const Donate =async (appid, escrow, whiteAsset) => {
  
    var amt =  window.prompt("Enter the amount you want to donate"); 
    let amount = parseInt(amt) * 1000000;
    let index = parseInt(appid);
    console.log("appId inside donate", index)

    try {
      const accounts = await myAlgoWallet.connect();
      const addresses = accounts.map(account => account.address);
      const params = await algodClient.getTransactionParams().do();

      let appArgs1 = [];
      appArgs1.push(new Uint8Array(Buffer.from("donate")));
      // let decAddr = algosdk.decodeAddress('EGUSS7HHM3ODVPW3Z2L55WPCZCR4TWSN2VVAKYPZKYEUER5BXM5N6YNH7I');
      // appArgs.push(decAddr.publicKey);
      //   console.log("(line:516) appArgs = ",appArgs)
      //localStorage.setItem("escrow", 'PKWSTDTMCYQQSFLNOW3W4TJN5VFJDR3KN5Q76G6OY6D4NFKHSFDZWC5BKY');
      let sender = addresses[0];
      let recv_escrow = escrow;
      // create unsigned transaction
      let transaction1 = algosdk.makeApplicationNoOpTxnFromObject({
        from:sender, 
        suggestedParams: params, 
        appIndex: index, 
        appArgs: appArgs1})
      
      let transaction2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
       from: sender, 
       to: recv_escrow, 
       amount: amount, 
        note: undefined,  
        suggestedParams: params});
      
      
      let data = `#pragma version 5
      // deploy app first then get id
      // replace id in this teal to create
      // the escrow address
      // use goal app update to set the
      // escrow address
      // This contract only spends out
      // it two transactions are grouped
      gtxn 0 TypeEnum
      int 4
      ==
      bnz opt_in

      gtxn 0 TypeEnum
      int 6
      ==
      gtxn 0 ApplicationArgs 0
      byte "donate"
      ==
      &&
      bnz donate

      gtxn 0 TypeEnum
      int 6
      ==
      gtxn 0 ApplicationArgs 0
      byte "whitelist"
      ==
      &&
      bnz white

      global GroupSize
      int 2
      ==
      // The first transaction must be
      // an ApplicationCall (ie call stateful smart contract)
      gtxn 0 TypeEnum
      int 6
      ==
      &&
      // The specific App ID must be called
      // This should be changed after creation
      gtxn 0 ApplicationID
      int 48873971
      ==
      &&
      // The applicaiton call must either be
      // A general applicaiton call or a delete
      // call
      gtxn 0 OnCompletion
      int NoOp
      ==
      int DeleteApplication
      gtxn 0 OnCompletion
      ==
      ||
      &&
      // verify neither transaction
      // contains a rekey

      gtxn 1 RekeyTo
      global ZeroAddress
      ==
      &&

      gtxn 1 RekeyTo
      global ZeroAddress
      ==
      &&
      gtxn 0 RekeyTo
      global ZeroAddress
      ==
      &&
      opt_in:
      int 1
      return
      donate:
      global GroupSize
      int 6
      ==
      gtxn 0 TypeEnum
      int 6
      ==
      &&
      // The specific App ID must be called
      // This should be changed after creation
      gtxn 0 ApplicationID
      int 48873971
      ==
      &&
      // The applicaiton call must either be
      // A general applicaiton call or a delete
      // call
      gtxn 0 OnCompletion
      int NoOp
      ==
      int DeleteApplication
      gtxn 0 OnCompletion
      ==
      ||
      &&
      int 1
      return

      white:
      global GroupSize
      int 3
      ==
      gtxn 0 TypeEnum
      int 6
      ==
      &&
      // The specific App ID must be called
      // This should be changed after creation
      gtxn 0 ApplicationID
      int 48873971
      ==
      &&
      // The applicaiton call must either be
      // A general applicaiton call or a delete
      // call
      gtxn 0 OnCompletion
      int NoOp
      ==
      int DeleteApplication
      gtxn 0 OnCompletion
      ==
      ||
      &&                           
      `;
      
      
      
      let results = await algodClient.compile(data).do();
      console.log("Hash = " + results.hash);
      console.log("Result = " + results.result);
      
      let program = new Uint8Array(Buffer.from(results.result, "base64"));
      
      let lsig = algosdk.makeLogicSig(program);
      console.log("Escrow =", lsig.address());
      
      let sender_es = lsig.address();
      let receiver_es = addresses[0];
      // let receiver = "<receiver-address>"";
      let amount_es = amount * 2;
      let closeToRemaninder = undefined;
      let note = undefined;
      let assetID = 48509793;
      let transaction3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sender_es, 
        to: receiver_es, 
        closeRemainderTo: closeToRemaninder, 
        amount: amount_es, 
        note: note, 
        assetIndex: assetID, 
        suggestedParams: params}); 
      
      
      let transaction4 = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
        from: lsig.address(),
        note: undefined,
        assetIndex: parseInt(whiteAsset),
        freezeTarget: addresses[0],
        freezeState:false,
        suggestedParams: params
      });


      let assetID_white = 48871930;
      let white_amount = parseInt(amt);
      let transaction5 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
       from: addresses[0], 
       to: "KZXULBIXNKJPYE4GN32DMN3OLCLAMCTLRSRDELCS5C67AW3E77KVVIOR7I", 
       closeRemainderTo: closeToRemaninder, 
       amount: white_amount, 
       note: note, 
       assetIndex: assetID_white, 
       suggestedParams: params});
      
      let transaction6 = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
          from: lsig.address(),
          note: undefined,
          assetIndex: parseInt(whiteAsset),
          freezeTarget: addresses[0],
          freezeState:true,
          suggestedParams: params
        });
      
      const groupID = algosdk.computeGroupID([ transaction1, transaction2, transaction3, transaction4, transaction5, transaction6 ]);
      const txs = [ transaction1, transaction2, transaction3, transaction4, transaction5, transaction6 ];
      txs[0].group = groupID;
      txs[1].group = groupID;
      txs[2].group = groupID;
      txs[3].group = groupID;
      txs[4].group = groupID;
      txs[5].group = groupID;
      
      const signedTx1 = await myAlgoConnect.signTransaction(txs[0].toByte());
      const signedTx2 = await myAlgoConnect.signTransaction(txs[1].toByte());
      const signedTx3 = algosdk.signLogicSigTransaction(txs[2], lsig);
      const signedTx4 = algosdk.signLogicSigTransaction(txs[3], lsig);
      const signedTx5 = await myAlgoConnect.signTransaction(txs[4].toByte());
      const signedTx6 = algosdk.signLogicSigTransaction(txs[5], lsig);
  const response = await algodClient.sendRawTransaction([ signedTx1.blob, signedTx2.blob, signedTx3.blob, signedTx4.blob, signedTx5.blob, signedTx6.blob ]).do();
  console.log("TxID", JSON.stringify(response, null, 1));
  await waitForConfirmation(algodClient, response.txId);
    } catch (err) {
      console.error(err);
    }


  
        //  mapTotal();
        //  mapGoal();
        
          
          // Use the AlgoSigner encoding library to make the transactions base
          
  
    }






/*Warning: Browser will block pop-up if user doesn't trigger myAlgoWallet.connect() with a button interation */
// const signTransaction = async () => {
//   const params = await algodClient.getTransactionParams().do();

//   const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
//       suggestedParams: {
//           ...params,
//       },
//       from: sender,
//       to: receiver, 
//       amount: 1,
//       note: undefined
//   });
  
//   const myAlgoConnect = new MyAlgoConnect();
//   const signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
// };


const unstake = () => {
  var amt = document.getElementById("tid2").value; 
  let unstakeamount = parseInt(amt) * 1000000;
  global.TextEncoder = require("util").TextEncoder; 
  const algosdk = require('algosdk');



// user declared algod connection parameters
//purestake api used
let algodServer = "https://testnet-algorand.api.purestake.io/ps2";
let algodToken = {
    'X-API-Key': '9oXsQDRlZ97z9mTNNd7JFaVMwhCaBlID2SXUOJWl'
   };

let algodPort = "";





// helper function to await transaction confirmation
// Function used to wait for a tx confirmation
const waitForConfirmation = async function (algodclient, txId) {
    let status = (await algodclient.status().do());
    let lastRound = status["last-round"];
      while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
          //Got the completed Transaction
          console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
          break;
        }
        lastRound++;
        await algodclient.statusAfterBlock(lastRound).do();
      }
    };



async function unstakeApp(account, index1,index2,amount) {

  var escrowdata = `#pragma version 4

  global GroupSize // size=6
  int 2
  >=
  global GroupSize // size=6
  int 6
  <=
  &&
  bz label1
  gtxn 0 ApplicationID // id=233725848
  int 49099237
  ==
  bnz label2
  b label1
  label2:
  gtxn 0 TypeEnum
  int 6 // ApplicationCall
  ==
  gtxn 0 OnCompletion
  int 0 // NoOp
  ==
  int 0
  gtxn 0 OnCompletion
  ==
  ||
  &&
  gtxn 1 RekeyTo // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ
  global ZeroAddress
  ==
  &&
  gtxn 0 RekeyTo // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ
  global ZeroAddress
  ==
  &&
  bnz label3
  label1:
  int 0
  return
  label3:
  int 1
  return
  
  `;
    
  // define sender
  let sender = account;
  let client = new algosdk.Algodv2(algodToken, algodServer, algodPort);

 // get node suggested parameters
  let params = await client.getTransactionParams().do();
  // comment out the next two lines to use suggested fee
  params.fee = 1000;
  params.flatFee = true;
  let appArgs1= [];
  
  appArgs1.push(new Uint8Array(Buffer.from("always")));
  console.log("(line:516) appArgs = ",appArgs1)

  // create unsigned transaction
  let transaction1 = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender, 
    suggestedParams: params, 
    appIndex: index1, 
    appArgs: appArgs1});
  //  let txId1 = transaction1.txID().toString();

  let appArgs2= [];
  
  appArgs2.push(new Uint8Array(Buffer.from("15")));
  console.log("(line:516) appArgs = ",appArgs2)

  // create unsigned transaction
  let transaction2 = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender, 
    suggestedParams: params, 
    appIndex: index2, 
    appArgs: appArgs2})
 
  //  let txId1 = transaction1.txID().toString();

  let results = await client.compile(escrowdata).do();
  console.log("Hash = " + results.hash);
  console.log("Result = " + results.result);
  let program = new Uint8Array(Buffer.from(results.result, "base64"));
 

let lsig = algosdk.makeLogicSig(program);
    

let sender1 = lsig.address();
console.log("logic",sender1)
    let receiver = sender;
    // let receiver = "<receiver-address>"";
    
   // let closeToRemaninder = sender;
    let note = undefined;
    let transaction3 =algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender1,
      to: receiver,
      amount: amount,
      note: undefined,
      assetIndex: 49116941,
      suggestedParams: params});
    let transaction4 =algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender,
      to: sender1,
      amount: 1000,
      note: undefined,
      suggestedParams: params});
    //let txns = [transaction1, transaction2,transaction3,transaction4];

//myAlgo start

const groupID = algosdk.computeGroupID([ transaction1, transaction2, transaction3, transaction4]);
      const txs = [ transaction1, transaction2, transaction3, transaction4];
      txs[0].group = groupID;
      txs[1].group = groupID;
      txs[2].group = groupID;
      txs[3].group = groupID;
      
      const signedTx1 = await myAlgoConnect.signTransaction(txs[0].toByte());
      const signedTx2 = await myAlgoConnect.signTransaction(txs[1].toByte());
      const signedTx3 = algosdk.signLogicSigTransaction(txs[2], lsig);
      const signedTx4 = await myAlgoConnect.signTransaction(txs[3].toByte());
  const response = await algodClient.sendRawTransaction([ signedTx1.blob, signedTx2.blob, signedTx3.blob, signedTx4.blob]).do();
  console.log("TxID", JSON.stringify(response, null, 1));
  await waitForConfirmation(algodClient, response.txId);




//myAlgo end















  //   let txgroup = algosdk.assignGroupID(txns);
  //   console.log("group = ", txgroup);
  //   let txn_b64_1 = transaction1.toByte();
  //   let txn_b64_2 = transaction2.toByte();
  //   let txn_b64_4 = transaction4.toByte();
  //   // let base64Txs1 =  AlgoSigner.encoding.msgpackToBase64(txn_b64_1);
  //   let base64Txs2 =  AlgoSigner.encoding.msgpackToBase64(txn_b64_2);
  //   let base64Txs4 =  AlgoSigner.encoding.msgpackToBase64(txn_b64_4);
  //   console.log("signing")
  //   console.log("group1 = ", txgroup);
  //   let base64Txs1 = AlgoSigner.encoding.msgpackToBase64(txn_b64_1);
  //   let signedTxs12 = await AlgoSigner.signTxn([
  //     {
  //       txn: base64Txs1,
  //     },
     
  //   ]);
  //   console.log("group2 = ", txgroup);
  //   let signedTxs22 = await AlgoSigner.signTxn([
  //     {
  //       txn: base64Txs2,
  //     },
     
  //   ]);


  //   let signedTxs42 = await AlgoSigner.signTxn([
  //     {
  //       txn: base64Txs4,
  //     },
     
  //   ]);
  //   let binarySignedTxs1 =  AlgoSigner.encoding.base64ToMsgpack(signedTxs12[0].blob);
  //   let binarySignedTxs2 =  AlgoSigner.encoding.base64ToMsgpack(signedTxs22[0].blob);

  //   //console.log("logic",signedTxs)
  //   let rawSignedTxn = algosdk.signLogicSigTransactionObject(transaction3,lsig);
  //   let binarySignedTxs4 =  AlgoSigner.encoding.base64ToMsgpack(signedTxs42[0].blob);
  //   //let binarySignedTxs = signedTxs.map((txn) => AlgoSigner.encoding.base64ToMsgpack(txn[0].blob));
  //   let signArr12 = [binarySignedTxs1,binarySignedTxs2,rawSignedTxn.blob,binarySignedTxs4];
  //   console.log("signed",rawSignedTxn.blob)
  //   let trans = await client.sendRawTransaction(signArr12).do();
  //    console.log("Send complete");
  // //   console.log("txID", trans);
  //    console.log("id", trans.txId);
  //  await waitForConfirmation(client, trans.txId);
  //   console.log("signed")
  
}
}


const connect = async () => {
    try {
        const accounts = await myAlgoConnect.connect();
        if(accounts !== null)
        console.log("Connected");
        else
        console.log("Not Connected");
    }
    catch (err) {
        console.error(err);
    }
}



  return (
    <div className="App">

                    <button onClick={()=>connect()}>
                        connect
                    </button><br /><br />

                      <button onClick={()=>send()}>
                        Send
                    </button><br /><br />

                    <button onClick={()=>Atomic()}>
                        Atomic
                    </button><br /><br />

                    <button onClick={()=>AtomicLsig()}>
                        Atomic Lsig
                    </button><br /><br />

                    <button onClick={()=>Donate(48873971, "JL2B3X4RABDFHCD6IVSXHXTKBZPVOQMOAHWVG37YFDEW3W6K3HWSB5WYK4", 48871930)}>
                        Atomic Donate
                    </button><br /><br />
    </div>
  );
}

export default App;
