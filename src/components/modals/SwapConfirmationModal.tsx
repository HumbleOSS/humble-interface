import React from 'react';
import { Dialog, Box, Typography, IconButton } from '@mui/material';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ModalContent = styled(Box)<{ $isDarkTheme?: boolean }>`
  background: ${props => props.$isDarkTheme ? '#20093E' : '#FFFFFF'};
  padding: 32px;
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`;

const Title = styled(Typography)<{ $isDarkTheme?: boolean }>`
  color: ${props => props.$isDarkTheme ? '#FFFFFF' : '#161717'};
  font-size: 24px;
  font-weight: 600;
  text-align: center;
`;

const Message = styled(Typography)<{ $isDarkTheme?: boolean }>`
  color: ${props => props.$isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'};
  font-size: 18px;
  text-align: center;
  line-height: 1.5;
  padding: 0 16px;
`;

const ViewButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: ${props => props.$isDarkTheme ? '#FFBE1D' : '#9933FF'};
  color: ${props => props.$isDarkTheme ? '#161717' : '#FFFFFF'};
  border: none;
  border-radius: 24px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

interface SwapConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  txId: string;
  fromAmount: string;
  toAmount: string;
  fromSymbol: string;
  toSymbol: string;
  isDarkTheme: boolean;
}

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
  open,
  onClose,
  txId,
  fromAmount,
  toAmount,
  fromSymbol,
  toSymbol,
  isDarkTheme,
}) => {
  const handleViewTransaction = () => {
    window.open(`https://block.voi.network/explorer/transaction/${txId}/global-state-delta`, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      }}
    >
      <ModalContent $isDarkTheme={isDarkTheme}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: isDarkTheme ? '#FFFFFF' : '#161717',
          }}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>

        <CheckCircleIcon
          sx={{
            fontSize: 80,
            color: isDarkTheme ? '#FFBE1D' : '#9933FF',
          }}
        />

        <Title $isDarkTheme={isDarkTheme}>
          Swap Successful!
        </Title>

        <Message $isDarkTheme={isDarkTheme}>
          Successfully swapped {fromAmount} {fromSymbol} for {toAmount} {toSymbol}
        </Message>

        <ViewButton
          $isDarkTheme={isDarkTheme}
          onClick={handleViewTransaction}
        >
          View Transaction
        </ViewButton>
      </ModalContent>
    </Dialog>
  );
};

export default SwapConfirmationModal; 