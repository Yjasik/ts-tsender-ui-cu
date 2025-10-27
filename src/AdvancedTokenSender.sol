// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TSender {
    
    event AirdropExecuted(
        address indexed sender,
        address indexed tokenAddress,
        uint256 totalAmount,
        uint256 recipientCount
    );

    function airdropERC20(
        address tokenAddress,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 totalAmount
    ) external {
        // Используем memory копии для уменьшения использования стека
        address[] memory recipientsMemory = recipients;
        uint256[] memory amountsMemory = amounts;
        uint256 recipientCount = recipientsMemory.length;
        
        require(recipientCount == amountsMemory.length, "Arrays length mismatch");
        require(recipientCount > 0, "No recipients provided");
        
        // Проверяем общую сумму
        uint256 calculatedTotal = 0;
        for (uint256 i = 0; i < recipientCount; i++) {
            calculatedTotal += amountsMemory[i];
        }
        require(calculatedTotal == totalAmount, "Total amount mismatch");

        // Проверяем баланс и разрешение
        _validateTokenPermissions(tokenAddress, totalAmount);

        // Выполняем трансферы
        for (uint256 i = 0; i < recipientCount; i++) {
            require(recipientsMemory[i] != address(0), "Invalid recipient");
            require(amountsMemory[i] > 0, "Amount must be positive");
            
            _safeTransferFrom(tokenAddress, msg.sender, recipientsMemory[i], amountsMemory[i]);
        }

        emit AirdropExecuted(msg.sender, tokenAddress, totalAmount, recipientCount);
    }

    function areListsValid(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external pure returns (bool) {
        if (recipients.length != amounts.length) {
            return false;
        }
        
        if (recipients.length == 0) {
            return false;
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0) || amounts[i] == 0) {
                return false;
            }
        }

        return true;
    }

    function _validateTokenPermissions(address token, uint256 requiredAmount) private view {
        uint256 balance = _getTokenBalance(token, msg.sender);
        require(balance >= requiredAmount, "Insufficient token balance");

        uint256 allowance = _getTokenAllowance(token, msg.sender, address(this));
        require(allowance >= requiredAmount, "Insufficient allowance");
    }

    function _getTokenBalance(address token, address account) private view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        require(success, "Balance check failed");
        return abi.decode(data, (uint256));
    }

    function _getTokenAllowance(address token, address owner, address spender) private view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("allowance(address,address)", owner, spender)
        );
        require(success, "Allowance check failed");
        return abi.decode(data, (uint256));
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success, "ERC20 transfer failed");
        if (data.length > 0) {
            require(abi.decode(data, (bool)), "ERC20 transfer returned false");
        }
    }

    // Вспомогательная функция для расчета общей суммы
    function calculateTotalAmount(uint256[] calldata amounts) external pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        return total;
    }
}