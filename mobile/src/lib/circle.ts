import { WalletSdk, SecurityQuestion, InputType } from '@circle-fin/w3s-pw-react-native-sdk';

const CIRCLE_ENDPOINT = 'https://api.circle.com/v1/w3s/';

const SECURITY_QUESTIONS: SecurityQuestion[] = [
    new SecurityQuestion('What was the name of your first pet?', InputType.text),
    new SecurityQuestion('What is your mother\'s maiden name?', InputType.text),
    new SecurityQuestion('What city were you born in?', InputType.text),
    new SecurityQuestion('What was the name of your primary school?', InputType.text),
    new SecurityQuestion('What is your oldest sibling\'s middle name?', InputType.text),
];

let initializedAppId: string | null = null;

async function ensureInit(appId: string): Promise<void> {
    if (initializedAppId === appId) return;
    await WalletSdk.init({ endpoint: CIRCLE_ENDPOINT, appId });
    WalletSdk.setSecurityQuestions(SECURITY_QUESTIONS);
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
    return new Promise((resolve, reject) => {
        WalletSdk.execute(
            challenge.userToken,
            challenge.encryptionKey,
            [challenge.challengeId],
            ({ result }) => {
                if (result?.status === 'FAILED') {
                    reject(new Error(`Circle challenge failed (${result.resultType})`));
                } else {
                    resolve();
                }
            },
            (error) => reject(new Error(error.message))
        );
    });
}
