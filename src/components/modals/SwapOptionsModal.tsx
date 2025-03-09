import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Switch,
} from "@mui/material";
import styled from "styled-components";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface SwapOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

const PRESET_SLIPPAGE_VALUES = [0.1, 0.5, 1.0];

const StyledDialog = styled(Dialog)<{ isDarkTheme: boolean }>`
  .MuiPaper-root {
    border-radius: 1rem;
    background-color: ${(props) => (props.isDarkTheme ? "#030712" : "white")};
    ${(props) =>
      props.isDarkTheme &&
      `
      border: 1px solid #1F2937;
    `}
  }

  .MuiBackdrop-root {
    backdrop-filter: blur(4px);
    background-color: ${(props) =>
      props.isDarkTheme ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)"};
  }
`;

const DialogContainer = styled.div`
  padding: 1.5rem;
`;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const StyledDialogTitle = styled(DialogTitle)<{ isDarkTheme: boolean }>`
  padding: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#111827")};
`;

const StyledDialogContent = styled(DialogContent)`
  padding: 0;
  & > * + * {
    margin-top: 1.5rem;
  }
`;

const SlippageHeader = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  color: ${(props) => (props.$isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const Label = styled.label<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#E5E7EB" : "#1F2937")};
`;

const CurrentValue = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.isDarkTheme ? "#D1D5DB" : "#4B5563")};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const PresetButton = styled.button<{ isActive: boolean; isDarkTheme: boolean }>`
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: colors 0.2s;
  flex: 1;

  ${(props) =>
    props.isActive
      ? `
    background-color: #3B82F6;
    color: white;
    &:hover {
      background-color: #2563EB;
    }
  `
      : `
    background-color: ${props.isDarkTheme ? "#111827" : "#F3F4F6"};
    border: ${props.isDarkTheme ? "1px solid #1F2937" : "none"};
    color: ${props.isDarkTheme ? "#E5E7EB" : "#374151"};
    &:hover {
      background-color: ${props.isDarkTheme ? "#1F2937" : "#E5E7EB"};
    }
  `}
`;

const InputContainer = styled.div`
  position: relative;
`;

const StyledInput = styled.input<{ isDarkTheme: boolean }>`
  width: 90%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid ${(props) => (props.isDarkTheme ? "#1F2937" : "#D1D5DB")};
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "white")};
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#374151")};

  &:focus {
    ring: 2px;
    ring-color: #3b82f6;
    border-color: #3b82f6;
  }

  &::placeholder {
    color: ${(props) => (props.isDarkTheme ? "#4B5563" : "#9ca3af")};
  }
`;

const InputSuffix = styled.span<{ $isDarkTheme?: boolean }>`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 500;
  color: ${(props) => (props.$isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const CloseButton = styled.button<{ $isDarkTheme?: boolean }>`
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${(props) => (props.$isDarkTheme ? "#374151" : "#F3F4F6")};
  color: ${(props) => (props.$isDarkTheme ? "#9CA3AF" : "#6B7280")};
  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme ? "#374151" : "#F3F4F6"};
  }
`;

const InfoIcon = styled(InfoOutlinedIcon)<{ isDarkTheme: boolean }>`
  margin-left: 0.25rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  cursor: help;
`;

const SwitchContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "#F3F4F6")};
  border: ${(props) => (props.isDarkTheme ? "1px solid #1F2937" : "none")};
`;

const SwitchLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WarningText = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.5rem;
  display: block;
`;

export function SwapOptionsModal({
  isOpen,
  onClose,
  isDarkTheme,
}: SwapOptionsModalProps) {
  const [currentSlippage, setCurrentSlippage] = useState<number>(() => {
    const stored = localStorage.getItem("currentSlippage");
    return stored ? parseFloat(stored) : 0.5; // Default to 0.5%
  });

  const [customSlippage, setCustomSlippage] = useState<string>(() => {
    const storedSlippage = localStorage.getItem("customSlippage");
    return storedSlippage || "";
  });

  const [degenMode, setDegenMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("degenMode");
    return stored ? JSON.parse(stored) : false;
  });

  const handleDegenModeChange = (checked: boolean) => {
    setDegenMode(checked);
    localStorage.setItem("degenMode", checked.toString());
  };

  const handleCustomSlippageChange = (value: string) => {
    if (!/^\d*\.?\d*$/.test(value) && value !== "0") return;
    setCustomSlippage(value);
    localStorage.setItem("customSlippage", value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setCurrentSlippage(numValue);
      localStorage.setItem("currentSlippage", numValue.toString());
    }
  };

  const handlePresetClick = (value: number) => {
    setCustomSlippage("");
    setCurrentSlippage(value);
    localStorage.setItem("currentSlippage", value.toString());
    localStorage.removeItem("customSlippage");
  };

  return (
    <StyledDialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      isDarkTheme={isDarkTheme}
    >
      <DialogContainer>
        <HeaderContainer>
          <StyledDialogTitle isDarkTheme={isDarkTheme}>
            Swap Settings
          </StyledDialogTitle>
          <CloseButton onClick={onClose} $isDarkTheme={isDarkTheme}>
            <CloseIcon />
          </CloseButton>
        </HeaderContainer>

        <StyledDialogContent>
          <div>
            <SlippageHeader $isDarkTheme={isDarkTheme}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Label isDarkTheme={isDarkTheme}>Max Slippage</Label>
                <Tooltip
                  title="Maximum acceptable difference between expected and actual trade price due to market fluctuations"
                  arrow
                >
                  <InfoIcon fontSize="small" isDarkTheme={isDarkTheme} />
                </Tooltip>
              </div>
              <CurrentValue isDarkTheme={isDarkTheme}>
                Current:{" "}
                <span style={{ color: "#3B82F6" }}>{currentSlippage}%</span>
              </CurrentValue>
            </SlippageHeader>
            <ButtonContainer>
              {PRESET_SLIPPAGE_VALUES.map((value) => (
                <PresetButton
                  key={value}
                  onClick={() => handlePresetClick(value)}
                  isActive={currentSlippage === value}
                  isDarkTheme={isDarkTheme}
                >
                  {value}%
                </PresetButton>
              ))}
            </ButtonContainer>
          </div>

          <div>
            <Label
              isDarkTheme={isDarkTheme}
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              Custom Slippage
            </Label>
            <InputContainer>
              <StyledInput
                type="text"
                value={customSlippage}
                onChange={(e) => handleCustomSlippageChange(e.target.value)}
                placeholder="Enter custom slippage"
                isDarkTheme={isDarkTheme}
              />
              <InputSuffix $isDarkTheme={isDarkTheme}>%</InputSuffix>
            </InputContainer>
          </div>

          <div>
            <SwitchContainer isDarkTheme={isDarkTheme}>
              <SwitchLabel>
                <Label isDarkTheme={isDarkTheme}>Degen Mode</Label>
                <Tooltip
                  title="Removes spending limit. Only enable if you know what you're doing!"
                  arrow
                >
                  <InfoIcon fontSize="small" isDarkTheme={isDarkTheme} />
                </Tooltip>
              </SwitchLabel>
              <Switch
                checked={degenMode}
                onChange={(e) => handleDegenModeChange(e.target.checked)}
                color="primary"
              />
            </SwitchContainer>
            {degenMode && (
              <WarningText isDarkTheme={isDarkTheme}>
                ⚠️ Warning: Degen Mode removes spending limit. Use at your own
                own risk!
              </WarningText>
            )}
          </div>
        </StyledDialogContent>
      </DialogContainer>
    </StyledDialog>
  );
}
