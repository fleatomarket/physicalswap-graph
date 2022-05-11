import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  PhysicalSwap,
  NFTRefunded,
  NFTScavenged,
  NFTWithdrawn,
  NewCharge,
  NewNFTDeposit,
  NewPayment,
  OkToDeliver,
  OkToPayout,
  OkToRefund,
  PaymentAndWithholdingRefunded,
  PaymentScavenged,
  PaymentWithdrawn,
  WithholdingScavenged,
  WithholdingWithdrawn

} from "../generated/PhysicalSwap/PhysicalSwap"
import { Charge, Payment, Product, User, NFT } from "../generated/schema"

const ApprovedState = [
  "UNINITIALIZED",
  "SUSPENSE",
  "OK_TO_DELIVER",
  "OK_TO_PAYOUT",
  "OK_TO_REFUND",
  "SCAVENGING"
]

const updateChargeStatus = (chargeCode: Bytes, address: Address, timestamp: BigInt): void => {
  let charge = new Charge(chargeCode.toHexString())
  let contract = PhysicalSwap.bind(address)
  let chargeStatus = contract.getChargeStatus(chargeCode);
  charge.state = ApprovedState[chargeStatus.value3];
  charge.lastUpdated = timestamp;
  charge.save();
}

const updatePaymentStatus = (chargeCode: Bytes, paymentCode: BigInt, address: Address, timestamp: BigInt): void => {
  let payment = new Payment(chargeCode.toHexString() + "-" + paymentCode.toString());
  let contract = PhysicalSwap.bind(address)
  let paymentStatus = contract.getPaymentStatus(chargeCode, paymentCode);
  payment.paymentWithdrawn = paymentStatus.value5;
  payment.withholdingWithdrawn = paymentStatus.value6;
  payment.paymentAndWithholdingRefunded = paymentStatus.value7;
  payment.paymentScavenged = paymentStatus.value8;
  payment.withholdingScavenged = paymentStatus.value9;
  payment.lastUpdated = timestamp;
  payment.save();
}

const updateNFTStatus = (chargeCode: Bytes, address: Address, timestamp: BigInt): NFT => {
  let contract = PhysicalSwap.bind(address)
  let nftStatus = contract.getNFTStatus(chargeCode);
  let nft = new NFT(chargeCode.toHexString());
  nft.contract = nftStatus.value0;
  nft.tokenId = nftStatus.value1;
  nft.nftInCustody = nftStatus.value2;
  nft.nftWithdrawn = nftStatus.value3;
  nft.nftRefunded = nftStatus.value4;
  nft.nftScavenged = nftStatus.value5;
  nft.charge = chargeCode.toHexString();
  nft.save();
  return nft;
}

export function handleNewCharge(event: NewCharge): void {
    // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let charge = new Charge(event.params.chargeCode.toHexString())
  let product = new Product(event.params.productCode.toHexString());
  let contract = PhysicalSwap.bind(event.address)
  let chargeStatus = contract.getChargeStatus(event.params.chargeCode);

  product.productCode = event.params.productCode;
  product.save();
  
  let seller = new User(chargeStatus.value1.toHexString());
  seller.address = chargeStatus.value1;
  seller.save();

  let buyer = new User(chargeStatus.value2.toHexString());
  buyer.address = chargeStatus.value2;
  buyer.save();

  let nft = updateNFTStatus(event.params.chargeCode, event.address, event.block.timestamp);

  // Entity fields can be set based on event parameters
  charge.chargeCode = event.params.chargeCode;
  charge.product = product.id;
  charge.buyer = buyer.id;
  charge.seller = seller.id;
  charge.nft = nft.id;
  charge.state = ApprovedState[chargeStatus.value3];
  charge.adjudicator = chargeStatus.value4;
  charge.paymentsLength = chargeStatus.value5.toI32();
  charge.created = chargeStatus.value6;
  charge.lastUpdated = event.block.timestamp;
  // Entities can be written to the store with `.save()`
  charge.save();
}

export function handleNewPayment(event: NewPayment): void {
  let payment = new Payment(event.params.chargeCode.toHexString() + "-" + event.params.paymentCode.toString());
  let contract = PhysicalSwap.bind(event.address)

  let paymentStatus = contract.getPaymentStatus(event.params.chargeCode, event.params.paymentCode);

  let sender = new User(paymentStatus.value0.toHexString());
  sender.address = paymentStatus.value0;
  sender.save();

  payment.charge = event.params.chargeCode.toHexString();
  payment.sender = sender.id;
  payment.paymentToken = paymentStatus.value1;
  payment.paymentAmount = paymentStatus.value2;
  payment.withholdingToken = paymentStatus.value3;
  payment.withholdingAmount = paymentStatus.value4;
  payment.paymentWithdrawn = paymentStatus.value5;
  payment.withholdingWithdrawn = paymentStatus.value6;
  payment.paymentAndWithholdingRefunded = paymentStatus.value7;
  payment.paymentScavenged = paymentStatus.value8;
  payment.withholdingScavenged = paymentStatus.value9;
  payment.created = paymentStatus.value10;
  payment.lastUpdated = event.block.timestamp;
  payment.save();

  let charge = new Charge(event.params.chargeCode.toHexString())
  let chargeStatus = contract.getChargeStatus(event.params.chargeCode);
  charge.paymentsLength = chargeStatus.value5.toI32();
  charge.lastUpdated = event.block.timestamp;
  charge.save();
}

export function handleOkToDeliver(event: OkToDeliver): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handleOkToPayout(event: OkToPayout): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handleOkToRefund(event: OkToRefund): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handlePaymentAndWithholdingRefunded(
  event: PaymentAndWithholdingRefunded
): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handlePaymentScavenged(event: PaymentScavenged): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handlePaymentWithdrawn(event: PaymentWithdrawn): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handleWithholdingScavenged(event: WithholdingScavenged): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handleWithholdingWithdrawn(event: WithholdingWithdrawn): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handleNewNFTDeposit(event: NewNFTDeposit): void {
  updateNFTStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handleNFTScavenged(event: NFTScavenged): void {
  updateNFTStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handleNFTWithdrawn(event: NFTWithdrawn): void {
  updateNFTStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handleNFTRefunded(event: NFTRefunded): void {
  updateNFTStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

