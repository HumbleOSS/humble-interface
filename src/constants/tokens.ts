export const TOKEN_VOI = 0;
export const TOKEN_VIA = 6779767;
//export const TOKEN_WVOI1 = 24590664;
export const TOKEN_WVOI1 = 34099056;

// TODO launchToken

export const CONNECTOR_ALGO_ARC200 = {
  ABI: {
    impure: [
      `_reachp_0((uint64,address,address,(uint64,byte[32],byte[8],uint256)))void`,
      `_reachp_2((uint64,(byte,byte[152])))void`,
      `arc200_approve(address,uint256)byte`,
      `arc200_transfer(address,uint256)byte`,
      `arc200_transferFrom(address,address,uint256)byte`,
      `createAllowanceBox(address,address)byte`,
      `createBalanceBox(address)byte`,
      `deregister()byte`,
      `grant(address)void`,
      `nop()void`,
      `register(byte[32],byte[32],byte[64],uint64,uint64,uint64)byte`,
      `touch()uint64`,
    ],
    pure: [
      `arc200_allowance(address,address)uint256`,
      `arc200_balanceOf(address)uint256`,
      `arc200_decimals()uint64`,
      `arc200_name()byte[32]`,
      `arc200_symbol()byte[8]`,
      `arc200_totalSupply()uint256`,
      `constructor()address`,
      `hasBox((byte,byte[64]))byte`,
      `manager()address`,
      `state()(address,byte,(byte,byte[152]))`,
      `supportsInterface(byte[4])byte`,
      `zeroAddress()address`,
    ],
    sigs: [
      `_reachp_0((uint64,address,address,(uint64,byte[32],byte[8],uint256)))void`,
      `_reachp_2((uint64,(byte,byte[152])))void`,
      `arc200_allowance(address,address)uint256`,
      `arc200_approve(address,uint256)byte`,
      `arc200_balanceOf(address)uint256`,
      `arc200_decimals()uint64`,
      `arc200_name()byte[32]`,
      `arc200_symbol()byte[8]`,
      `arc200_totalSupply()uint256`,
      `arc200_transfer(address,uint256)byte`,
      `arc200_transferFrom(address,address,uint256)byte`,
      `constructor()address`,
      `createAllowanceBox(address,address)byte`,
      `createBalanceBox(address)byte`,
      `deregister()byte`,
      `grant(address)void`,
      `hasBox((byte,byte[64]))byte`,
      `manager()address`,
      `nop()void`,
      `register(byte[32],byte[32],byte[64],uint64,uint64,uint64)byte`,
      `state()(address,byte,(byte,byte[152]))`,
      `supportsInterface(byte[4])byte`,
      `touch()uint64`,
      `zeroAddress()address`,
    ],
  },
  GlobalNumByteSlice: 6,
  GlobalNumUint: 0,
  LocalNumByteSlice: 0,
  LocalNumUint: 0,
  appApproval: `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`,
  appClear: `CQ==`,
  appClearMap: {},
  companionInfo: null,
  extraPages: 1,
  stateKeys: 5,
  stateSize: 531,
  unsupported: [],
  version: 13,
};

export const CONNECTOR_ALGO_SWAP200 = {
  ABI: {
    impure: [
      `Protocol_delete()void`,
      `Protocol_harvest(address,(uint256,uint256,uint256,address,byte))((uint256,uint256),uint64)`,
      `Provider_deposit(byte,(uint256,uint256),uint256)uint256`,
      `Provider_withdraw(byte,uint256,(uint256,uint256))(uint256,uint256)`,
      `Trader_exactSwapAForB(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_exactSwapBForA(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_swapAForB(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_swapBForA(byte,uint256,uint256)(uint256,uint256)`,
      `_reachp_0((uint64,((byte[32],byte[8]),(uint64,uint64,uint64),address)))void`,
      `_reachp_2((uint64,()))void`,
      `_reachp_3((uint64,(byte,byte[161])))void`,
      `arc200_approve(address,uint256)byte`,
      `arc200_transfer(address,uint256)byte`,
      `arc200_transferFrom(address,address,uint256)byte`,
      `createAllowanceBox(address,address)void`,
      `createBalanceBox(address)void`,
    ],
    pure: [
      `Info()((uint256,uint256),(uint256,uint256),(uint256,uint256,uint256,address,byte),(uint256,uint256),uint64,uint64)`,
      `arc200_allowance(address,address)uint256`,
      `arc200_balanceOf(address)uint256`,
      `arc200_decimals()uint64`,
      `arc200_name()byte[32]`,
      `arc200_symbol()byte[8]`,
      `arc200_totalSupply()uint256`,
      `hasBox((byte,byte[64]))byte`,
      `supportsInterface(byte[4])byte`,
    ],
    sigs: [
      `Info()((uint256,uint256),(uint256,uint256),(uint256,uint256,uint256,address,byte),(uint256,uint256),uint64,uint64)`,
      `Protocol_delete()void`,
      `Protocol_harvest(address,(uint256,uint256,uint256,address,byte))((uint256,uint256),uint64)`,
      `Provider_deposit(byte,(uint256,uint256),uint256)uint256`,
      `Provider_withdraw(byte,uint256,(uint256,uint256))(uint256,uint256)`,
      `Trader_exactSwapAForB(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_exactSwapBForA(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_swapAForB(byte,uint256,uint256)(uint256,uint256)`,
      `Trader_swapBForA(byte,uint256,uint256)(uint256,uint256)`,
      `_reachp_0((uint64,((byte[32],byte[8]),(uint64,uint64,uint64),address)))void`,
      `_reachp_2((uint64,()))void`,
      `_reachp_3((uint64,(byte,byte[161])))void`,
      `arc200_allowance(address,address)uint256`,
      `arc200_approve(address,uint256)byte`,
      `arc200_balanceOf(address)uint256`,
      `arc200_decimals()uint64`,
      `arc200_name()byte[32]`,
      `arc200_symbol()byte[8]`,
      `arc200_totalSupply()uint256`,
      `arc200_transfer(address,uint256)byte`,
      `arc200_transferFrom(address,address,uint256)byte`,
      `createAllowanceBox(address,address)void`,
      `createBalanceBox(address)void`,
      `hasBox((byte,byte[64]))byte`,
      `supportsInterface(byte[4])byte`,
    ],
  },
  GlobalNumByteSlice: 7,
  GlobalNumUint: 0,
  LocalNumByteSlice: 0,
  LocalNumUint: 0,
  appApproval: `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`,
  appClear: `CQ==`,
  extraPages: 3,
  stateKeys: 6,
  stateSize: 706,
  unsupported: [],
  version: 13,
};
