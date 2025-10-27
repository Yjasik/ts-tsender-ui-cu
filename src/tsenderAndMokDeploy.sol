// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockToken.sol";
import "../src/AdvancedTokenSender.sol";

contract DeployScript is Script {
    function run() external {
        // Получаем приватный ключ из .env или используем дефолтный от Anvil
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Деплоим MockToken
        console.log("\n1. Deploying MockToken...");
        MockToken mockToken = new MockToken();
        console.log("MockToken deployed at:", address(mockToken));
        console.log("MockToken name:", mockToken.name());
        console.log("MockToken total supply:", mockToken.totalSupply());

        // 2. Деплоим AdvancedTokenSender
        console.log("\n2. Deploying AdvancedTokenSender...");
        uint256 commissionRate = 50; // 0.5%
        AdvancedTokenSender tokenSender = new AdvancedTokenSender(commissionRate);
        console.log("AdvancedTokenSender deployed at:", address(tokenSender));
        console.log("Commission rate:", tokenSender.commissionRate());

        // 3. Минтим токены на контракт AdvancedTokenSender
        console.log("\n3. Minting tokens to AdvancedTokenSender...");
        uint256 mintAmount = 1000 * 10**18; // 1000 токенов
        mockToken.mint(address(tokenSender), mintAmount);
        console.log("Minted", mintAmount / 10**18, "tokens to AdvancedTokenSender");
        console.log("TokenSender balance:", mockToken.balanceOf(address(tokenSender)) / 10**18, "MT");

        vm.stopBroadcast();

        // Сохраняем адреса в файл
        string memory addresses = string(abi.encodePacked(
            "MOCK_TOKEN_ADDRESS=", vm.toString(address(mockToken)), "\n",
            "TOKEN_SENDER_ADDRESS=", vm.toString(address(tokenSender)), "\n",
            "DEPLOYER_ADDRESS=", vm.toString(deployer)
        ));
        
        vm.writeFile("deployed_addresses.txt", addresses);
        console.log("\nAddresses saved to deployed_addresses.txt");
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockToken:", address(mockToken));
        console.log("AdvancedTokenSender:", address(tokenSender));
        console.log("Deployer:", deployer);
    }
}