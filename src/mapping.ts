import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  PhysicalSwap,
  FleatoCharge,
  OkToDeliver,
  OkToPayout,
  OkToRefund,
  Refunded,
  PaymentScavenged,
  FeeScavenged,
  PaymentWithdrawn,
  FeeWithdrawn
} from "../generated/PhysicalSwap/PhysicalSwap"
import { Charge, Payment, Product, User } from "../generated/schema"

const ChargeStatus = [
  "UNINITIALIZED",
  "SUSPENSE",
  "OK_TO_DELIVER",
  "OK_TO_PAYOUT",
  "OK_TO_REFUND",
  "SCAVENGING"
]

export function handleFleatoCharge(event: FleatoCharge): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let charge = new Charge(event.params.chargeCode.toHexString())
  let receiver = new User(event.params.receiver.toHexString());
  let product = new Product(event.params.productCode.toHexString());
  receiver.address = event.params.receiver;
  receiver.save();

  product.productCode = event.params.productCode;
  product.save();

  // Entity fields can be set based on event parameters
  charge.chargeCode = event.params.chargeCode;
  charge.product = product.id;

  let contract = PhysicalSwap.bind(event.address)
  let chargeStatus = contract.getChargeStatus(event.params.chargeCode);

  charge.receiver = receiver.id;
  charge.status = ChargeStatus[chargeStatus.value2];
  charge.adjudicator = chargeStatus.value3;
  charge.paymentsCount = chargeStatus.value4.toI32();
  charge.created = chargeStatus.value5;
  charge.lastUpdated = event.block.timestamp;
  // Entities can be written to the store with `.save()`
  charge.save();

  let payment = new Payment(event.params.chargeCode.toHexString() + "-" + event.params.paymentCode.toString());

  let paymentStatus = contract.getPaymentStatus(event.params.chargeCode, event.params.paymentCode);
  let sender = new User(paymentStatus.value0.toHexString());
  sender.address = paymentStatus.value0;
  sender.save();

  payment.charge = event.params.chargeCode.toHexString();
  payment.sender = sender.id;
  payment.paymentToken = paymentStatus.value1;
  payment.paymentAmount = paymentStatus.value2;
  payment.feeAmount = paymentStatus.value3;
  payment.paymentWithdrawn = paymentStatus.value4;
  payment.feeWithdrawn = paymentStatus.value5;
  payment.refunded = paymentStatus.value6;
  payment.paymentScavenged = paymentStatus.value7;
  payment.feeScavenged = paymentStatus.value8;
  payment.created = paymentStatus.value9;
  payment.lastUpdated = event.block.timestamp;
  payment.save();

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.getChargeStatus(...)
  // - contract.getPaymentStatus(...)
  // - contract.refund(...)
  // - contract.scavenge(...)
  // - contract.withdrawFee(...)
  // - contract.withdrawPayment(...)
}

const updateChargeStatus = (chargeCode: Bytes, address: Address, timestamp: BigInt): void => {
  let charge = new Charge(chargeCode.toHexString())
  let contract = PhysicalSwap.bind(address)
  let chargeStatus = contract.getChargeStatus(chargeCode);
  charge.status = ChargeStatus[chargeStatus.value2];
  charge.lastUpdated = timestamp;
  charge.save();
}

const updatePaymentStatus = (chargeCode: Bytes, paymentCode: BigInt, address: Address, timestamp: BigInt): void => {
  let payment = new Payment(chargeCode.toHexString() + "-" + paymentCode.toString());
  let contract = PhysicalSwap.bind(address)
  let paymentStatus = contract.getPaymentStatus(chargeCode, paymentCode);
  payment.paymentWithdrawn = paymentStatus.value4;
  payment.feeWithdrawn = paymentStatus.value5;
  payment.refunded = paymentStatus.value6;
  payment.paymentScavenged = paymentStatus.value7;
  payment.feeScavenged = paymentStatus.value8;
  payment.lastUpdated = timestamp;
  payment.save();
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

export function handleRefunded(event: Refunded): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
}

export function handlePaymentScavenged(event: PaymentScavenged): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handleFeeScavenged(event: FeeScavenged): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handlePaymentWithdrawn(event: PaymentWithdrawn): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}

export function handleFeeWithdrawn(event: FeeWithdrawn): void {
  updateChargeStatus(event.params.chargeCode, event.address, event.block.timestamp);
  updatePaymentStatus(event.params.chargeCode, event.params.paymentCode, event.address, event.block.timestamp);
}
