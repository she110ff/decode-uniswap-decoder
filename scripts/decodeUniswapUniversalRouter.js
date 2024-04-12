const { abi: SwapRouterAbi} = require('@uniswap/universal-router/artifacts/contracts/UniversalRouter.sol/UniversalRouter.json')
const ethers = require("ethers");

const contractInterface = new ethers.utils.Interface(SwapRouterAbi);
const util = require("util");
const {
    hasUniswapCommands,
    uniswapCommands,
    uniswapCommandArray,
    uniswapInputArray,
    uniswapDecodedInputArray,
    uniswapV3DecodedInputArray,
    uniswapDeadline,
    uniswapFullDecodedInput,
} = require("../utils/uniswapDecoder/universalDecoder");

require('dotenv').config()
const provider = new ethers.providers.WebSocketProvider(process.env.WEBSOCKET_URL)
const rpcProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)

let limit = 50
const main = async () => {
    provider.on('pending', async (hash) => {
        if(limit > 0) {
            console.log('pending hash :', hash)
            getTransaction(hash)
            limit -= 1
        }
    });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const UNISWAP_ADDRESSES = [
    // '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // swap router 02
    // '0xE592427A0AEce92De3Edee1F18E0157C05861564', // swap router
    '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // universal swap router
]
const compose = (...fns) => arg => fns.reduce((composed, f) => f(composed),arg);
let txIdx = 0
const getTransaction = async (transactionHash) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
        const txnData = await provider.getTransaction(transactionHash);
        txnData
            ? (UNISWAP_ADDRESSES.includes(txnData.to) && hasUniswapCommands(txnData['data']))
                ? compose(
                    console.log("uniswapCommands: ", util.inspect(uniswapCommands(txnData['data']), false, null, true )),
                    console.log("uniswapCommandArray: ", util.inspect(uniswapCommandArray(txnData['data']), false, null, true )),
                    console.log("uniswapInputArray: ", util.inspect(uniswapInputArray(txnData['data']), false, null, true)),
                    console.log("uniswapDecodedInputArray: ", util.inspect(uniswapDecodedInputArray(txnData['data']), false, null, true )),
                    console.log("uniswapV3DecodedInputArray: ", util.inspect(uniswapV3DecodedInputArray(txnData['data']), false, null, true )),
                    console.log("uniswapDeadline: ", util.inspect(uniswapDeadline(txnData['data']), false, null, true )),
                    console.log("uniswapFullDecodedInput: ", util.inspect(uniswapFullDecodedInput(txnData['data']), false, null, true))
                )
                : null
            : null ;
        await delay(1000);
    }
}

const decodeTransaction = (txInput, txIdx, isMulticall = false) => {
    console.log('decodeTransaction : txInput : ', txInput)
    const decodedData = contractInterface.parseTransaction({ data: txInput })

    const functionName = decodedData.name

    const args = decodedData.args
    const params = args.params
    const data = args.data

    logFunctionName(functionName, txIdx, isMulticall)


    if (functionName === 'exactInputSingle') { return logExactInputSingle(params) }

    if (functionName === 'exactOutputSingle') { return logExactOutputSingle(params) }

    if (functionName === 'exactInput') { return logExactInput(params) }

    if (functionName === 'exactOutput') { return logExactOutput(params) }

    if (functionName === 'selfPermit') { return logSelfPermit(args) }

    if (functionName === 'refundETH') { return logRefundETH(args) }

    if (functionName === 'unwrapWETH9') { return logUnwrapWETH9(args) }

    if (functionName === 'multicall') { return parseMulticall(data, txIdx) }

    console.log('ADD THIS FUNCTION:', functionName)
    console.log('decodedData:', decodedData)
}

const logFunctionName = (functionName, txIdx, isMulticall) => {
    if (isMulticall) {
        console.log()
        console.log('-------', `Fn: ${txIdx}`, functionName);
        return
    }

    console.log()
    console.log('======================================================================================')
    console.log('==============================', `Tx: ${txIdx} - ${functionName}`, '==============================')
    console.log('======================================================================================')
}

const parseMulticall = (data, txIdx) => {
    data.forEach((tx, fnIdx) => {
        decodeTransaction(tx, fnIdx, true)
    })
}

const logUnwrapWETH9 = (args) => {
    console.log('amountMinimum:    ', args.amountMinimum)
    console.log('recipient:        ', args.recipient)
}

const logExactInputSingle = (params) => {
    console.log('tokenIn:          ', params.tokenIn)
    console.log('tokenOut:         ', params.tokenOut)
    console.log('fee:              ', params.fee)
    console.log('recipient:        ', params.recipient)
    console.log('deadline:         ', params.deadline)
    console.log('amountIn:         ', params.amountIn)
    console.log('amountOutMinimum: ', params.amountOutMinimum)
    console.log('sqrtPriceLimitX96:', params.sqrtPriceLimitX96)
}

const logExactOutputSingle = (params) => {
    console.log('tokenIn:          ', params.tokenIn)
    console.log('tokenOut:         ', params.tokenOut)
    console.log('fee:              ', params.fee)
    console.log('recipient:        ', params.recipient)
    console.log('deadline:         ', params.deadline)
    console.log('amountOut:        ', params.amountOut)
    console.log('amountInMaximum:  ', params.amountInMaximum)
    console.log('sqrtPriceLimitX96:', params.sqrtPriceLimitX96)
}

const logExactInput = (params) => {
    console.log('path:             ', params.path)
    console.log('recipient:        ', params.recipient)
    console.log('deadline:         ', params.deadline)
    console.log('amountIn:         ', params.amountIn)
    console.log('amountOutMinimum: ', params.amountOutMinimum)
}

const logExactOutput = (params) => {
    console.log('path:             ', params.path)
    console.log('recipient:        ', params.recipient)
    console.log('deadline:         ', params.deadline)
    console.log('amountOut:        ', params.amountOut)
    console.log('amountInMaximum:  ', params.amountInMaximum)
}

const logSelfPermit = (params) => {
    console.log('token:            ', params.token)
    console.log('value:            ', params.value)
    console.log('deadline:         ', params.deadline)
}

const logRefundETH = (params) => {
    console.log('Nothing to log')
}



main()

/*
    node scripts/03_listenMempool.js
*/