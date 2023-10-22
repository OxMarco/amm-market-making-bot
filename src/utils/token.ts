import { ethers } from 'ethers';
import { ERC20_ABI } from '../abi/erc20';

export async function approve(
  token: string,
  address: string,
  amount: bigint,
  signer: any,
) {
  const contract = new ethers.Contract(token, ERC20_ABI, signer);

  const approveTx = await contract.approve(address, amount);
  return await approveTx.wait();
}

export async function transfer(
  token: string,
  to: string,
  amount: bigint,
  signer: any,
) {
  const contract = new ethers.Contract(token, ERC20_ABI, signer);

  const transferTx = await contract.transfer(to, amount);
  return await transferTx.wait();
}

export async function balance(
  token: string,
  address: string,
  provider: any,
): Promise<{ balance: number; decimals: number }> {
  const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
  const balance: number = await tokenContract.balanceOf(address);
  const decimals: number = await tokenContract.decimals();

  return { balance, decimals };
}
