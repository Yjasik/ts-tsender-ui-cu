"use client"

import { useMemo, useState, useEffect } from "react"
import InputField from "./ui/inputField"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "@wagmi/core"
import { calculateTotal } from "@/utils"

// Ключи для localStorage
const STORAGE_KEYS = {
    TOKEN_ADDRESS: 'airdrop_token_address',
    RECIPIENTS: 'airdrop_recipients',
    AMOUNTS: 'airdrop_amounts'
}

export default function AirdropForm() {
    const [tokenAddress, setTokenAddress] = useState("")
    const [recipients, setRecipients] = useState("")
    const [amounts, setAmounts] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false)
    const [isWaitingTransaction, setIsWaitingTransaction] = useState(false)
    const [tokenName, setTokenName] = useState<string>("")
    const [tokenDecimals, setTokenDecimals] = useState<number>(18) // По умолчанию 18 decimals
    const chainId = useChainId()
    const config = useConfig()
    const account = useAccount()
    const total = useMemo(() => calculateTotal(amounts), [amounts])
    const { data: hash, isPending, writeContractAsync } = useWriteContract()

    // Загрузка данных из localStorage при монтировании компонента
    useEffect(() => {
        const savedTokenAddress = localStorage.getItem(STORAGE_KEYS.TOKEN_ADDRESS)
        const savedRecipients = localStorage.getItem(STORAGE_KEYS.RECIPIENTS)
        const savedAmounts = localStorage.getItem(STORAGE_KEYS.AMOUNTS)

        if (savedTokenAddress) setTokenAddress(savedTokenAddress)
        if (savedRecipients) setRecipients(savedRecipients)
        if (savedAmounts) setAmounts(savedAmounts)
    }, [])

    // Получение информации о токене при изменении адреса токена
    useEffect(() => {
        const fetchTokenInfo = async () => {
            if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
                setTokenName("")
                setTokenDecimals(18)
                return
            }

            try {
                // Получаем имя токена
                const name = await readContract(config, {
                    abi: erc20Abi,
                    address: tokenAddress as `0x${string}`,
                    functionName: "name",
                })
                setTokenName(name as string)

                // Получаем decimals токена
                const decimals = await readContract(config, {
                    abi: erc20Abi,
                    address: tokenAddress as `0x${string}`,
                    functionName: "decimals",
                })
                setTokenDecimals(decimals as number)
            } catch (error) {
                console.error("Error fetching token info:", error)
                setTokenName("Unknown Token")
                setTokenDecimals(18) // По умолчанию 18 если не удалось получить
            }
        }

        fetchTokenInfo()
    }, [tokenAddress, config])

    // Функции для обновления состояния с сохранением в localStorage
    const handleTokenAddressChange = (value: string) => {
        setTokenAddress(value)
        localStorage.setItem(STORAGE_KEYS.TOKEN_ADDRESS, value)
    }

    const handleRecipientsChange = (value: string) => {
        setRecipients(value)
        localStorage.setItem(STORAGE_KEYS.RECIPIENTS, value)
    }

    const handleAmountsChange = (value: string) => {
        setAmounts(value)
        localStorage.setItem(STORAGE_KEYS.AMOUNTS, value)
    }

    // Функция для очистки всех сохраненных данных
    const clearSavedData = () => {
        setTokenAddress("")
        setRecipients("")
        setAmounts("")
        setTokenName("")
        setTokenDecimals(18)
        localStorage.removeItem(STORAGE_KEYS.TOKEN_ADDRESS)
        localStorage.removeItem(STORAGE_KEYS.RECIPIENTS)
        localStorage.removeItem(STORAGE_KEYS.AMOUNTS)
    }

    // Получаем amounts как есть (такое же значение как в поле ввода)
    const amountsAsEntered = useMemo(() => {
        if (!amounts) return []
        return amounts.split(/[,\n]+/)
            .map(amt => amt.trim())
            .filter(amt => amt !== '')
    }, [amounts])

    // Расчеты для Amount (tokens) - конвертируем из wei в токены
    const amountsInTokens = useMemo(() => {
        return amountsAsEntered.map(amt => {
            try {
                const amountWei = BigInt(amt)
                const divisor = BigInt(10 ** tokenDecimals)
                const tokens = Number(amountWei) / Number(divisor)
                return tokens.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: tokenDecimals
                })
            } catch (error) {
                return "0"
            }
        })
    }, [amountsAsEntered, tokenDecimals])

    async function getApprovedAmount(tSenderAddress: string | null): Promise<number> {
        if (!tSenderAddress) {
            alert("This chain only has the safer version!")
            return 0
        }
        const response = await readContract(config, {
            abi: erc20Abi,
            address: tokenAddress as `0x${string}`,
            functionName: "allowance",
            args: [account.address, tSenderAddress as `0x${string}`],
        })
        return response as number
    }

    async function handleSubmit() {
        if (!account.address) {
            alert("Please connect your wallet first")
            return
        }

        if (!tokenAddress) {
            alert("Please enter token address")
            return
        }

        if (!recipients || !amounts) {
            alert("Please enter recipients and amounts")
            return
        }

        setIsLoading(true)
        setIsWaitingConfirmation(true)

        try {
            const tSenderAddress = chainsToTSender[chainId]["tsender"] 
            const result = await getApprovedAmount(tSenderAddress)
            
            if (result < total) {
                // Этап 1: Подтверждение approve в кошельке
                setIsWaitingConfirmation(true)
                const approvalHash = await writeContractAsync({
                    abi: erc20Abi,
                    address: tokenAddress as `0x${string}`,
                    functionName: "approve",
                    args: [tSenderAddress as `0x${string}`, BigInt(total)],
                })

                // Этап 2: Ожидание включения транзакции approve в блок
                setIsWaitingConfirmation(false)
                setIsWaitingTransaction(true)
                const approvalReceipt = await waitForTransactionReceipt(config, {
                    hash: approvalHash,
                })
                console.log("Approval confirmed:", approvalReceipt)

                // Этап 3: Подтверждение airdrop в кошельке
                setIsWaitingTransaction(false)
                setIsWaitingConfirmation(true)
                const airdropHash = await writeContractAsync({
                    abi: tsenderAbi,
                    address: tSenderAddress as `0x${string}`,
                    functionName: "airdropERC20",
                    args: [
                        tokenAddress,
                        recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                        amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                        BigInt(total),
                    ],
                })

                // Этап 4: Ожидание включения транзакции airdrop в блок
                setIsWaitingConfirmation(false)
                setIsWaitingTransaction(true)
                const airdropReceipt = await waitForTransactionReceipt(config, {
                    hash: airdropHash,
                })
                console.log("Airdrop confirmed:", airdropReceipt)

            } else {
                // Только airdrop - без approve
                setIsWaitingConfirmation(true)
                const airdropHash = await writeContractAsync({
                    abi: tsenderAbi,
                    address: tSenderAddress as `0x${string}`,
                    functionName: "airdropERC20",
                    args: [
                        tokenAddress,
                        recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                        amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                        BigInt(total),
                    ],
                })

                setIsWaitingConfirmation(false)
                setIsWaitingTransaction(true)
                const airdropReceipt = await waitForTransactionReceipt(config, {
                    hash: airdropHash,
                })
                console.log("Airdrop confirmed:", airdropReceipt)
            }

            // Успешное завершение - можно очистить данные или оставить
            alert("Airdrop completed successfully!")
            // clearSavedData() // Раскомментируйте если хотите очищать данные после успешной отправки
            
        } catch (error) {
            console.error("Airdrop failed:", error)
            alert("Airdrop failed: " + (error as Error).message)
        } finally {
            setIsLoading(false)
            setIsWaitingConfirmation(false)
            setIsWaitingTransaction(false)
        }
    }

    const getButtonText = () => {
        if (isWaitingConfirmation) {
            return "Confirm in wallet"
        } else if (isWaitingTransaction) {
            return "Waiting transaction to be included"
        } else {
            return "Send tokens"
        }
    }

    const isButtonDisabled = isLoading || !account.address || !tokenAddress || !recipients || !amounts

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-2xl border-2 border-blue-500 rounded-xl p-6 bg-white shadow-lg">
                {/* Форма ввода */}
                <div className="space-y-4">
                    <InputField
                        label="Token address"
                        placeholder="0x"
                        value={tokenAddress}
                        onChange={handleTokenAddressChange}
                    />
                    <InputField
                        label="Recipients"
                        placeholder="0x1234, 0x1234"
                        value={recipients}
                        onChange={handleRecipientsChange}
                        large={true}
                    />
                    <InputField
                        label="Amount (wei)"
                        placeholder="10000000000000000000, 20000000000000000000, ..."
                        value={amounts}
                        onChange={handleAmountsChange}
                        large={true}
                    />
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={handleSubmit}
                            disabled={isButtonDisabled}
                            className={`
                                ${isButtonDisabled 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
                                } 
                                text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg 
                                transition-all duration-200 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center gap-2
                                min-w-[200px] flex-1
                            `}
                        >
                            {(isWaitingConfirmation || isWaitingTransaction) && (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {getButtonText()}
                        </button>

                        {/* Кнопка очистки */}
                        <button
                            type="button"
                            onClick={clearSavedData}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                            title="Clear all fields"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Transaction Details */}
                {(tokenAddress && amounts) && (
                    <div className="mt-6 border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction Details</h3>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Token name:</span>
                                <span className="font-medium text-gray-800">
                                    {tokenName || "Loading..."}
                                </span>
                            </div>
                            
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount (wei):</span>
                                <span className="font-mono text-gray-800 text-xs">
                                    {amountsAsEntered.join(', ')}
                                </span>
                            </div>
                            
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount (tokens):</span>
                                <span className="font-medium text-gray-800">
                                    {amountsInTokens.join(', ')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Показываем хэш транзакции если есть */}
                {hash && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-sm">
                            Transaction submitted: 
                            <a 
                                href={`https://etherscan.io/tx/${hash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-2 underline hover:text-green-600"
                            >
                                View on Explorer
                            </a>
                        </p>
                    </div>
                )}

                {/* Индикатор сохраненных данных */}
                {(tokenAddress || recipients || amounts) && (
                    <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-600 text-xs">
                            💾 Your inputs are automatically saved locally
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}