import type {
    Chain,
    ChainAddress,
    ChainContext,
    Network,
    Signer,
    TxHash,
    TokenId,

} from "@wormhole-foundation/sdk";
import {
    DEFAULT_TASK_TIMEOUT,
    TokenTransfer,
    TransferState,
    Wormhole,
    amount,
    api,
    isTokenId,
    tasks,
} from "@wormhole-foundation/sdk";

import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';

// Use .env.example as a template for your .env file and populate it with secrets
// for funded accounts on the relevant chain+network combos to run the example

function getEnv(key: string): string {
    // If we're in the browser, return empty string
    if (typeof process === undefined) return "";

    // Otherwise, return the env var or error
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var ${key}, did you forget to set values in '.env'?`);

    return val;
}

export interface SignerStuff<N extends Network, C extends Chain = Chain> {
    chain: ChainContext<N, C>;
    signer: Signer<N, C>;
    address: ChainAddress<C>;
}

export async function getSigner<N extends Network, C extends Chain>(
    chain: ChainContext<N, C>
): Promise<{
    chain: ChainContext<N, C>;
    signer: Signer<N, C>;
    address: ChainAddress<C>;
}> {
    let signer: Signer;
    const platform = chain.platform.utils()._platform;

    switch (platform) {
        case 'Solana':
            signer = await (
                await solana()
            ).getSigner(await chain.getRpc(),
                // getEnv('SOL_PRIVATE_KEY')
                "EHo1hfiVxMD441m5p8jT2D1bSubxvRTLuUbwCfdDFwPeJwkZscEt1jnrnafPT7krMgZtrJmjTTBxqyYN2jfNZws"
            );
            break;
        case 'Evm':
            signer = await (
                await evm()
            ).getSigner(await chain.getRpc(),
                // getEnv('ETH_PRIVATE_KEY')
                "fd28d7074d5caf9338ae7da4446b512cde827cd2a85f0937887dc81f80ff217f"
            );
            break;
        default:
            throw new Error('Unsupported platform: ' + platform);
    }

    return {
        chain,
        signer: signer as Signer<N, C>,
        address: Wormhole.chainAddress(chain.chain, signer.address()),
    };
}
export async function waitLog<N extends Network = Network>(
    wh: Wormhole<N>,
    xfer: TokenTransfer<N>,
    tag: string = "WaitLog",
    timeout: number = DEFAULT_TASK_TIMEOUT,
) {
    const tracker = TokenTransfer.track(wh, TokenTransfer.getReceipt(xfer), timeout);
    let receipt;
    for await (receipt of tracker) {
        console.log(`${tag}: Current trasfer state: `, TransferState[receipt.state]);
    }
    return receipt;
}

export async function getTokenDecimals<
    N extends 'Mainnet' | 'Testnet' | 'Devnet'
>(
    wh: Wormhole<N>,
    token: TokenId,
    sendChain: ChainContext<N, any>
): Promise<number> {
    return isTokenId(token)
        ? Number(await wh.getDecimals(token.chain, token.address))
        : sendChain.config.nativeTokenDecimals;
}