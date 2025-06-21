// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LSDLockbox
 * @dev Smart contract for locking Liquid Staking Derivative (LSD) tokens on Ethereum
 * to mint wrapped versions on Stellar network via bridge validators.
 * 
 * This contract serves as the Ethereum side of the Paralyx Protocol bridge,
 * enabling users to lock their stETH and other LSDs to receive wrapped tokens
 * on Stellar that can be used as collateral in the lending protocol.
 */
contract LSDLockbox is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Supported LSD tokens
    mapping(address => bool) public supportedTokens;
    mapping(address => string) public tokenToStellarSymbol;
    
    // User deposits tracking
    mapping(address => mapping(address => uint256)) public userDeposits;
    mapping(address => uint256) public totalLocked;
    
    // Bridge configuration
    mapping(address => bool) public validators;
    uint256 public requiredValidators;
    uint256 public minLockAmount;
    uint256 public maxLockAmount;
    
    // Events
    event AssetLocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        string stellarAddress,
        string stellarSymbol,
        uint256 indexed lockId
    );
    
    event AssetUnlocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 indexed lockId
    );
    
    event TokenSupported(
        address indexed token,
        string stellarSymbol,
        bool supported
    );
    
    event ValidatorUpdated(
        address indexed validator,
        bool authorized
    );

    // Lock tracking
    uint256 public nextLockId;
    
    struct LockInfo {
        address user;
        address token;
        uint256 amount;
        string stellarAddress;
        bool unlocked;
        uint256 timestamp;
    }
    
    mapping(uint256 => LockInfo) public locks;

    constructor() {
        requiredValidators = 1; // Start with single validator
        minLockAmount = 1e15; // 0.001 tokens (18 decimals)
        maxLockAmount = 1000e18; // 1000 tokens max per transaction
        nextLockId = 1;
    }

    /**
     * @dev Lock LSD tokens to mint wrapped versions on Stellar
     * @param token Address of the ERC20 token to lock
     * @param amount Amount of tokens to lock (in token's native decimals)
     * @param stellarAddress User's Stellar wallet address to receive wrapped tokens
     */
    function lockAsset(
        address token,
        uint256 amount,
        string calldata stellarAddress
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[token], "Token not supported");
        require(amount >= minLockAmount, "Amount below minimum");
        require(amount <= maxLockAmount, "Amount exceeds maximum");
        require(bytes(stellarAddress).length > 0, "Invalid Stellar address");
        require(bytes(stellarAddress).length <= 64, "Stellar address too long");
        
        // Validate Stellar address format (basic check)
        require(_isValidStellarAddress(stellarAddress), "Invalid Stellar address format");
        
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Transfer tokens to this contract
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update tracking
        userDeposits[msg.sender][token] += amount;
        totalLocked[token] += amount;
        
        // Store lock information
        uint256 lockId = nextLockId++;
        locks[lockId] = LockInfo({
            user: msg.sender,
            token: token,
            amount: amount,
            stellarAddress: stellarAddress,
            unlocked: false,
            timestamp: block.timestamp
        });
        
        // Emit event for bridge validators
        emit AssetLocked(
            msg.sender,
            token,
            amount,
            stellarAddress,
            tokenToStellarSymbol[token],
            lockId
        );
    }

    /**
     * @dev Emergency unlock function (admin only, for emergencies)
     * @param lockId ID of the lock to reverse
     */
    function emergencyUnlock(uint256 lockId) external onlyOwner {
        LockInfo storage lockInfo = locks[lockId];
        require(!lockInfo.unlocked, "Already unlocked");
        require(lockInfo.amount > 0, "Invalid lock");
        
        lockInfo.unlocked = true;
        userDeposits[lockInfo.user][lockInfo.token] -= lockInfo.amount;
        totalLocked[lockInfo.token] -= lockInfo.amount;
        
        IERC20(lockInfo.token).safeTransfer(lockInfo.user, lockInfo.amount);
        
        emit AssetUnlocked(lockInfo.user, lockInfo.token, lockInfo.amount, lockId);
    }

    /**
     * @dev Add or remove support for an LSD token
     * @param token Address of the ERC20 token
     * @param stellarSymbol Symbol for the wrapped token on Stellar
     * @param supported Whether the token should be supported
     */
    function setSupportedToken(
        address token,
        string calldata stellarSymbol,
        bool supported
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        
        supportedTokens[token] = supported;
        if (supported) {
            require(bytes(stellarSymbol).length > 0, "Symbol required");
            require(bytes(stellarSymbol).length <= 12, "Symbol too long");
            tokenToStellarSymbol[token] = stellarSymbol;
        } else {
            delete tokenToStellarSymbol[token];
        }
        
        emit TokenSupported(token, stellarSymbol, supported);
    }

    /**
     * @dev Add or remove bridge validator
     * @param validator Address of the validator
     * @param authorized Whether the validator is authorized
     */
    function setValidator(address validator, bool authorized) external onlyOwner {
        require(validator != address(0), "Invalid validator address");
        validators[validator] = authorized;
        emit ValidatorUpdated(validator, authorized);
    }

    /**
     * @dev Update bridge configuration
     * @param _requiredValidators Number of validators required for consensus
     * @param _minLockAmount Minimum amount that can be locked
     * @param _maxLockAmount Maximum amount that can be locked per transaction
     */
    function updateBridgeConfig(
        uint256 _requiredValidators,
        uint256 _minLockAmount,
        uint256 _maxLockAmount
    ) external onlyOwner {
        require(_requiredValidators > 0, "Need at least 1 validator");
        require(_minLockAmount < _maxLockAmount, "Invalid amount range");
        
        requiredValidators = _requiredValidators;
        minLockAmount = _minLockAmount;
        maxLockAmount = _maxLockAmount;
    }

    /**
     * @dev Pause contract operations (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get user's total deposits for a token
     * @param user User address
     * @param token Token address
     * @return amount Total amount locked by user for the token
     */
    function getUserDeposits(address user, address token) external view returns (uint256) {
        return userDeposits[user][token];
    }

    /**
     * @dev Get lock details by ID
     * @param lockId Lock ID to query
     * @return lockInfo Complete lock information
     */
    function getLockInfo(uint256 lockId) external view returns (LockInfo memory) {
        return locks[lockId];
    }

    /**
     * @dev Check if a token is supported
     * @param token Token address to check
     * @return supported Whether the token is supported
     * @return stellarSymbol Symbol for wrapped token on Stellar
     */
    function getTokenInfo(address token) external view returns (bool supported, string memory stellarSymbol) {
        return (supportedTokens[token], tokenToStellarSymbol[token]);
    }

    /**
     * @dev Basic validation for Stellar address format
     * @param stellarAddress Address to validate
     * @return valid Whether the address appears to be a valid Stellar address
     */
    function _isValidStellarAddress(string memory stellarAddress) internal pure returns (bool) {
        bytes memory addressBytes = bytes(stellarAddress);
        
        // Stellar addresses are typically 56 characters and start with 'G'
        if (addressBytes.length != 56) {
            return false;
        }
        
        if (addressBytes[0] != 'G') {
            return false;
        }
        
        // Basic character set validation (A-Z, 2-7 for base32)
        for (uint i = 0; i < addressBytes.length; i++) {
            bytes1 char = addressBytes[i];
            if (!(
                (char >= 'A' && char <= 'Z') ||
                (char >= '2' && char <= '7')
            )) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Emergency withdrawal function (only owner, contract must be paused)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner whenPaused {
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        IERC20(token).safeTransfer(owner(), amount);
    }
} 