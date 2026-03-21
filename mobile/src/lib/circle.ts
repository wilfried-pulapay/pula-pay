import { WalletSdk } from '@circle-fin/w3s-pw-react-native-sdk';

const CIRCLE_ENDPOINT = 'https://api.circle.com/v1/w3s/';

let initializedAppId: string | null = null;

async function ensureInit(appId: string): Promise<void> {
    if (initializedAppId === appId) return;
    await WalletSdk.init({ endpoint: CIRCLE_ENDPOINT, appId });
    initializedAppId = appId;
}

type CircleChallenge = {
    challengeId: string;
    userToken: string;
    encryptionKey: string;
    appId: string;
};

/**
 * Executes a Circle SDK challenge (PIN setup, transfer confirmation, etc.)
 * Throws if the challenge fails or the result status is FAILED.
 */
export async function executeCircleChallenge(challenge: CircleChallenge): Promise<void> {
    await ensureInit(challenge.appId);
    const { result } = await WalletSdk.execute(
        challenge.userToken,
        challenge.encryptionKey,
        [challenge.challengeId]
    );
    if (result?.status === 'FAILED') {
        throw new Error(`Circle challenge failed (${result.resultType})`);
    }
}
