// Function to encode an array of addresses
import { AbiCoder, BrowserProvider, getAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ERC725 as ERC725Type } from '@/types/ERC725';
import { ERC725YDataKeys, LSP1_TYPE_IDS } from '@lukso/lsp-smart-contracts';
import { ERC725__factory } from '@/types';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import { getChecksumAddress } from './tokenUtils';
import { DEFAULT_UP_URD_PERMISSIONS } from '@/app/constants';
import { transactionTypeMap } from '@/constants/assistantTypes';
/*
import { ERC725YDataKeys, LSP1_TYPE_IDS } from '@lukso/lsp-smart-contracts';
import { getChecksumAddress } from './fieldValidations';
import {
  DEFAULT_UP_CONTROLLER_PERMISSIONS,
  DEFAULT_UP_URD_PERMISSIONS,
  UAP_CONTROLLER_PERMISSIONS,
} from '@/constants/constants';
import { ERC725__factory } from '@/types';
import { transactionTypeMap } from '@/components/TransactionTypeBlock';
*/

export const generateMappingKey = (keyName: string, typeId: string): string => {
  const hashedKey = keccak256(toUtf8Bytes(keyName));
  const first10Bytes = hashedKey.slice(2, 22);
  const last20Bytes = typeId.slice(2, 42);
  return '0x' + first10Bytes + '0000' + last20Bytes;
};

export function generateExecutiveScreenersKey(typeId: string, executiveAddress: string): string {
  const hashedFirstWord = keccak256(toUtf8Bytes("UAPExecutiveScreeners"));
  const first6Bytes = hashedFirstWord.slice(2, 14);
  const second4Bytes = typeId.slice(2, 10);
  const last20Bytes = executiveAddress.slice(2, 42);
  return "0x" + first6Bytes + second4Bytes + "0000" + last20Bytes;
}

export function generateScreenerConfigKey(typeId: string, executiveAddress: string, screenerAddress: string): string {
  const hashedFirstWord = keccak256(toUtf8Bytes("UAPScreenerConfig"));
  const first6Bytes = hashedFirstWord.slice(2, 14);
  const second4Bytes = typeId.slice(2, 10);
  const last20Bytes = executiveAddress.slice(2, 22) + screenerAddress.slice(2, 22);
  return "0x" + first6Bytes + second4Bytes + "0000" + last20Bytes;
}

export function generateCurationScreenerBlocklistKey(executiveAddress: string, screenerAddress: string, itemAddress: string): string {
  const hashedFirstWord = keccak256(toUtf8Bytes("UAPList"));
  const first6Bytes = hashedFirstWord.slice(2, 14);
  const second4Bytes = executiveAddress.slice(2, 10);
  const last20Bytes = screenerAddress.slice(2, 22) + itemAddress.slice(2, 22);
  return "0x" + first6Bytes + second4Bytes + "0000" + last20Bytes;
}

export function generateListMappingKey(executiveAddress: string, screenerAddress: string, itemAddress: string): string {
  const hashedFirstWord = keccak256(toUtf8Bytes("UAPList"));
  const first6Bytes = hashedFirstWord.slice(2, 14);
  const executiveBytes4 = executiveAddress.slice(2, 10);
  const screenerBytes10 = screenerAddress.slice(2, 22);
  const itemBytes10 = itemAddress.slice(2, 22);
  return "0x" + first6Bytes + executiveBytes4 + "0000" + screenerBytes10 + itemBytes10;
}

// Generates the list set key (mirrors contract logic)
export function generateListSetKey(executiveAddress: string, screenerAddress: string): string {
  const hashedFirstWord = keccak256(toUtf8Bytes("UAPList"));
  const first6Bytes = hashedFirstWord.slice(2, 14);
  const executiveBytes4 = executiveAddress.slice(2, 10);
  const screenerBytes10 = screenerAddress.slice(2, 22);
  const endingBytes10 = "0".repeat(16) + "5b5d"
  return "0x" + first6Bytes + executiveBytes4 + "0000" + screenerBytes10 + endingBytes10;
}

// Reads the current list set from the Universal Profile
export async function getListSet(up: ERC725Type, executiveAddress: string, screenerAddress: string): Promise<string[]> {
  const setKey = generateListSetKey(executiveAddress, screenerAddress);
  const value = await up.getData(setKey);
  if (value === "0x" || value.length === 0) return [];
  return AbiCoder.defaultAbiCoder().decode(["address[]"], value)[0];
}

// Adds an address to the list set if not already present
export async function addToListSetPayload(up: ERC725Type, executiveAddress: string, screenerAddress: string, itemAddress: string) {
  const currentSet = await getListSet(up, executiveAddress, screenerAddress);
  if (currentSet.includes(itemAddress)) return AbiCoder.defaultAbiCoder().encode(["address[]"], [currentSet]);
  const newSet = [...currentSet, itemAddress];
  const encodedValue = AbiCoder.defaultAbiCoder().encode(["address[]"], [newSet]);
  return encodedValue;
}

// Removes an address from the list set if present
export async function removeFromListSetPayload(up: ERC725Type, executiveAddress: string, screenerAddress: string, itemAddress: string) {
  const currentSet = await getListSet(up, executiveAddress, screenerAddress);
  const index = currentSet.indexOf(itemAddress);
  if (index === -1) return AbiCoder.defaultAbiCoder().encode(["address[]"], [currentSet]);
  const newSet = currentSet.filter((_, i) => i !== index);
  const encodedValue = newSet.length ? AbiCoder.defaultAbiCoder().encode(["address[]"], [newSet]) : "0x";
  return encodedValue;
}

// Sets or removes an address in the list (combines mapping and set operations)
export async function setListEntry(up: ERC725Type, executiveAddress: string, screenerAddress: string, itemAddress: string, isInList: boolean) {
  const mappingKey = generateListMappingKey(executiveAddress, screenerAddress, itemAddress);
  const setKey = generateListSetKey(executiveAddress, screenerAddress);
  const value = isInList ? AbiCoder.defaultAbiCoder().encode(["bool"], [true]) : "0x";
  let listPayload = "0x"
  if (isInList) {
    listPayload = await addToListSetPayload(up, executiveAddress, screenerAddress, itemAddress);
  } else {
    listPayload = await removeFromListSetPayload(up, executiveAddress, screenerAddress, itemAddress);
  }
  await up.setDataBatch([mappingKey, setKey], [value, listPayload]);
}

// Function to decode the encoded value for protocol assistant addresses
export function customDecodeAddresses(encoded: string): string[] {
  // Remove "0x" prefix for easier handling
  const data = encoded.startsWith('0x') ? encoded.substring(2) : encoded;

  // Decode the number of addresses (first 4 characters represent 2 bytes)
  const numAddressesHex = data.substring(0, 4);
  const numAddresses = parseInt(numAddressesHex, 16);

  // Extract each 20-byte address
  let addresses: string[] = [];
  for (let i = 0; i < numAddresses; i++) {
    const startIdx = 4 + i * 40; // 4 hex chars for length, then 40 hex chars per address (20 bytes)
    const addressHex = `0x${data.substring(startIdx, startIdx + 40)}`;
    addresses.push(getAddress(addressHex)); // Normalize address
  }

  return addresses;
}

export const subscribeToUapURD = async (
  provider: BrowserProvider,
  upAccount: string,
  uapURD: string
) => {
  const signer = await provider.getSigner();
  const URDdataKey = ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegate;
  const LSP7URDdataKey =
    ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegatePrefix +
    LSP1_TYPE_IDS.LSP7Tokens_RecipientNotification.slice(2, 42);
  const LSP8URDdataKey =
    ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegatePrefix +
    LSP1_TYPE_IDS.LSP8Tokens_RecipientNotification.slice(2, 42);

  const delegateKeys = [URDdataKey, LSP7URDdataKey, LSP8URDdataKey];
  const delegateValues = [uapURD, '0x', '0x'];

  const UP = ERC725__factory.connect(upAccount, provider);
  const upPermissions = new ERC725(
    LSP6Schema as ERC725JSONSchema[],
    upAccount,
    window.lukso
  );
  const checksumUapURD = getChecksumAddress(uapURD) as string;

  // Retrieve current controllers from the UP's permissions.
  const currentPermissionsData = await upPermissions.getData();
  const currentControllers = currentPermissionsData[0].value as string[];

  // Remove any existing instances of the UAP-URD to avoid duplicates.
  let updatedControllers = currentControllers.filter((controller: string) => {
    return getChecksumAddress(controller) !== checksumUapURD;
  });

  // Add the UAP-URD to the controllers.
  updatedControllers.push(checksumUapURD);

  // 4. Prepare permissions for the UAP-URD.
  const uapURDPermissions = upPermissions.encodePermissions({
    SUPER_CALL: true,
    SUPER_TRANSFERVALUE: true,
    ...DEFAULT_UP_URD_PERMISSIONS,
  });

  // Encode the new permissions and updated controllers data.
  const permissionsData = upPermissions.encodeData([
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: checksumUapURD,
      value: uapURDPermissions,
    },
    {
      keyName: 'AddressPermissions[]',
      value: updatedControllers,
    },
  ]);

  // 5. Batch update all the data on the UP.
  const allKeys = [...delegateKeys, ...permissionsData.keys];
  const allValues = [...delegateValues, ...permissionsData.values];

  const tx = await UP.connect(signer).setDataBatch(allKeys, allValues);
  return tx.wait();
};

export const unsubscribeFromUapURD = async (
  provider: BrowserProvider,
  upAccount: string,
  uapURD: string,
  defaultURDUP: string
) => {
  const signer = await provider.getSigner();
  const upContract = ERC725__factory.connect(upAccount, signer);

  const allTypeIds = Object.values(transactionTypeMap).map(obj => obj.id);
  const typeConfigKeys = allTypeIds.map(id =>
    generateMappingKey('UAPTypeConfig', id)
  );
  const typeConfigValues = await upContract.getDataBatch(typeConfigKeys);
  const allDiscoveredAssistants = new Set<string>();
  typeConfigValues.forEach(encodedVal => {
    if (encodedVal && encodedVal !== '0x') {
      const addresses = customDecodeAddresses(encodedVal);
      addresses.forEach(addr =>
        allDiscoveredAssistants.add(addr.toLowerCase())
      );
    }
  });

  const removeTypeKeys = typeConfigKeys;
  const removeTypeValues = typeConfigValues.map(() => '0x');

  const removeAssistantKeys: string[] = [];
  const removeAssistantValues: string[] = [];
  allDiscoveredAssistants.forEach(assistantLower => {
    const assistantKey = generateMappingKey(
      'UAPExecutiveConfig',
      assistantLower
    );
    removeAssistantKeys.push(assistantKey);
    removeAssistantValues.push('0x');
  });

  const upPermissions = new ERC725(LSP6Schema, upAccount, window.lukso);
  const URDdataKey = ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegate;
  const delegateKeys = [URDdataKey];
  const delegateValues = [defaultURDUP];

  // Ensure we remove the UAP URD from the controllers array
  const checksumUapURD = getChecksumAddress(uapURD) as string;
  const currentPermissionsData = await upPermissions.getData();
  const currentControllers = currentPermissionsData[0].value as string[];
  const updatedControllers = currentControllers.filter(
    (controller: string) => getChecksumAddress(controller) !== checksumUapURD
  );
  const uapURDPermissions = '0x';
  const permissionsData = upPermissions.encodeData([
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: checksumUapURD,
      value: uapURDPermissions,
    },
    {
      keyName: 'AddressPermissions[]',
      value: updatedControllers,
    },
  ]);

  const allKeys = [
    ...removeTypeKeys,
    ...removeAssistantKeys,
    ...delegateKeys,
    ...permissionsData.keys,
  ];
  const allValues = [
    ...removeTypeValues,
    ...removeAssistantValues,
    ...delegateValues,
    ...permissionsData.values,
  ];

  const tx = await upContract.setDataBatch(allKeys, allValues);
  return tx.wait();
};

