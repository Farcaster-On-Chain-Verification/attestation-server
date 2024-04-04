import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ethers } from "ethers";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { readFileSync } from "fs";
import path from "path";

const NEYNAR_URL = process.env.NEYNAR_URL ?? "";
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const FARCASTER_ATTESTOR = process.env.FARCASTER_ATTESTOR ?? "";
const DOMAIN = process.env.DOMAIN ?? "";
const EAS_CONTRACT = process.env.EAS_CONTRACT ?? "";
const EAS_SCHEMA = process.env.EAS_SCHEMA ?? "";
const RPC_PROVIDER = process.env.RPC_PROVIDER ?? "";

interface FarcasterMessage {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    castId: {
      fid: number;
      hash: string;
    };
  };
  trustedData: {
    messageBytes: string;
  };
}

const mainPageBody = `
<div>
        <h1>
          Help build a trustful decentralized identity infraestructure ⛓️
        </h1>
        <p>
          Verify your Farcaster account and claim your Gitcoin Passport stamp to improve your humanity and reputation score!
        </p>
        <p>
            Go to <a href='https://warpcast.com/gonzalomelov/0x6631596f'>Warpcast</a> and complete the steps directly on the Frame!
        </p>
    </div>
`;

let pageFromTemplate = (
  imageUrl: string,
  button1Text: string,
  apiUrl: string,
  body: string
) => `
<!DOCTYPE html>
<html lang='en'>

<head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <meta name='next-size-adjust' />
    <meta property='fc:frame' content='vNext' />
    <meta property='fc:frame:image' content='${imageUrl}' />
    <meta property='fc:frame:button:1' content='${button1Text}' />
    <meta property='fc:frame:post_url' content='${apiUrl}' />
    <meta property='og:title' content='Azle farcaster frame' />
    <meta property='og:image' content='${imageUrl}' />
    <title>Azle farcaster frame</title>
</head>

<body>
    ${body}
</body>

</html>
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body as FarcasterMessage;

    const response = await fetch(`${NEYNAR_URL}/farcaster/frame/validate`, {
      method: "POST",
      headers: {
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cast_reaction_context: true,
        follow_context: true,
        signer_context: true,
        message_bytes_in_hex: body.trustedData.messageBytes,
      }),
    });

    const trustedData = await response.json();

    console.log(trustedData);

    const {
      action: {
        interactor: {
          fid,
          verified_addresses: { eth_addresses },
        },
      },
    } = trustedData;

    console.log("fid", fid);
    console.log("eth_addresses", eth_addresses[1]);

    // TODO
    // Let the user choose which wallet to use
    // Recast and follow

    const customProvider = new ethers.JsonRpcProvider(RPC_PROVIDER);

    const wallet = new ethers.Wallet(FARCASTER_ATTESTOR, customProvider);

    console.log(`Wallet: ${wallet.address}`);

    const schemaEncoder = new SchemaEncoder("uint32 fid,uint64 timestamp");

    const encoded = schemaEncoder.encodeData([
      { name: "fid", type: "uint32", value: 111 },
      { name: "timestamp", type: "uint64", value: Date.now() },
    ]);

    console.log(`encoded: ${encoded}`);

    const info = {
      schema: EAS_SCHEMA,
      data: {
        recipient: eth_addresses[1],
        data: encoded,
        expirationTime: BigInt(0),
        revocable: false,
        refUID: ethers.ZeroHash,
        value: BigInt(0),
      },
    };

    let abiPath = path.join(process.cwd(), "abi.json");
    let { abi } = JSON.parse(readFileSync(abiPath).toString());

    const contract = new ethers.Contract(EAS_CONTRACT, abi, wallet);

    const tx = await contract.attest(info);

    console.log(`Transaction sent with hash: ${tx.hash}`);

    tx.wait();

    // const receipt = await tx.wait();

    // const uid = receipt.logs[0].data;

    // console.log(`uid`, uid);

    res.send(
      pageFromTemplate(
        "https://farcaster-on-chain-verification.s3.amazonaws.com/frame2.gif",
        "Refresh",
        `${DOMAIN}/refresh?address=${eth_addresses[1]}`,
        // `${DOMAIN}/refresh?uid=${uid}`,
        mainPageBody
      )
    );
  } catch (err) {
    let message = "";
    if (typeof err === "string") {
      message = err;
    } else if (err instanceof Error) {
      message = err.message;
    }

    res.send(
      pageFromTemplate(
        "https://ipfs.io/ipfs/QmawGYH6TdvxsC1zhMXtAPJcjy7R5yCMQ6SBmUrwGD5pNE",
        message,
        `${DOMAIN}/refresh`,
        mainPageBody
      )
    );
  }
}
