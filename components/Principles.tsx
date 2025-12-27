import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  Container,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
} from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { diamondAddress } from '../primitives/Diamond';
import { getThirdwebClient } from '../src/utils/createThirdwebClient';

// Initialize the client
const client = getThirdwebClient();

// Contract address
const contractAddress = diamondAddress;

// Contract ABI (unchanged)
const abi: any = [
  { "inputs": [], "name": "EnumerableSet__IndexOutOfBounds", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PrinciplesAccepted", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "oldName", "type": "string" }, { "indexed": false, "internalType": "string", "name": "newName", "type": "string" }], "name": "SignerNameUpdated", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "acceptPrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getAcceptanceSignature", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [], "name": "getAllPrinciples", "outputs": [{ "components": [{ "internalType": "string", "name": "japaneseName", "type": "string" }, { "internalType": "string", "name": "englishName", "type": "string" }, { "internalType": "string", "name": "description", "type": "string" }], "internalType": "struct TUCOperatingPrinciples.Principle[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllSigners", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "getPrinciple", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPrincipleCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getSignerCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }], "name": "getSignerDetails", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "hasPrinciplesAccepted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "initializePrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "isPrinciplesInitialized", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }, { "internalType": "string", "name": "newName", "type": "string" }], "name": "updateSignerName", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// Japanese Synthwave Palette
const synthwavePalette = {
  backgroundGradient: 'linear-gradient(135deg, #00141a 0%, #ff69b4 50%, #00ccff 100%)',
  neonPink: '#ff69b4',
  neonPurple: '#00ccff', // Mapping purple to Cyan for consistency
  softTeal: '#00ccff',
  textGlow: '#f5f5f5',
  darkZen: '#00141a',
};

// Styled Components
const PageContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: 'transparent',
  color: synthwavePalette.textGlow,
  paddingTop: '100px',
  paddingBottom: '50px',
});

const ContentContainer = styled(Container)({
  maxWidth: '900px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

const PrinciplesCard = styled(Box)({
  background: synthwavePalette.backgroundGradient,
  borderRadius: '24px',
  padding: '32px',
  boxShadow: '0 16px 48px rgba(255, 79, 126, 0.3)',
  height: 'calc(100vh - 200px)', // Fixed height for the panel
  overflowY: 'auto', // Make the panel itself scrollable
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, rgba(255, 79, 126, 0.2) 0%, rgba(42, 11, 61, 0.9) 70%)',
    borderRadius: '24px',
    zIndex: 0,
  },
});

const StyledAccordion = styled(Accordion)({
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${synthwavePalette.neonPurple}`,
  borderRadius: '12px',
  marginBottom: '16px',
  color: synthwavePalette.textGlow,
  backdropFilter: 'blur(8px)',
  zIndex: 2,
  position: 'relative',
  '&::before': { display: 'none' },
  '&:hover': {
    boxShadow: `0 0 20px ${synthwavePalette.neonPink}`,
  },
});

const StyledAccordionSummary = styled(AccordionSummary)({
  background: 'rgba(26, 11, 46, 0.7)',
  borderRadius: '12px 12px 0 0',
  padding: '16px 24px',
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: synthwavePalette.neonPink,
  },
});

const StyledAccordionDetails = styled(AccordionDetails)({
  background: 'rgba(26, 11, 46, 0.9)',
  borderRadius: '0 0 12px 12px',
  padding: '16px 24px',
  lineHeight: 1.6,
});

const SigningSection = styled(Box)({
  background: 'rgba(26, 11, 46, 0.85)',
  borderRadius: '16px',
  padding: '32px',
  border: `2px solid ${synthwavePalette.neonPurple}`,
  boxShadow: `0 0 20px ${synthwavePalette.neonPurple}`,
  zIndex: 2,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'center',
});

const StyledButton = styled(Button)({
  background: synthwavePalette.neonPink,
  color: synthwavePalette.textGlow,
  borderRadius: '24px',
  padding: '14px 32px',
  fontSize: '16px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  boxShadow: `0 0 10px ${synthwavePalette.neonPink}`,
  '&:hover': {
    background: synthwavePalette.softTeal,
    boxShadow: `0 0 15px ${synthwavePalette.softTeal}`,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
});

const CustomInput = styled('input')({
  background: 'rgba(255, 255, 255, 0.1)',
  border: `1px solid ${synthwavePalette.neonPurple}`,
  borderRadius: '8px',
  padding: '16px 20px',
  width: '100%',
  maxWidth: '400px',
  color: synthwavePalette.textGlow,
  fontSize: '16px',
  outline: 'none',
  '&:focus': {
    borderColor: synthwavePalette.neonPink,
    boxShadow: `0 0 10px ${synthwavePalette.neonPink}`,
  },
  '&::placeholder': {
    color: 'rgba(245, 245, 245, 0.6)',
  },
});

const StyledTypography = styled(Typography)({
  color: synthwavePalette.textGlow,
  textShadow: `0 0 5px ${synthwavePalette.neonPurple}`,
  zIndex: 1,
  position: 'relative',
});

const Title = styled(Typography)({
  color: synthwavePalette.textGlow,
  textShadow: `0 0 5px ${synthwavePalette.neonPurple}`,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '16px',
  zIndex: 1,
  position: 'relative',
});

const SubTitle = styled(Typography)({
  color: synthwavePalette.textGlow,
  textShadow: `0 0 5px ${synthwavePalette.neonPurple}`,
  textAlign: 'center',
  marginBottom: '32px',
  zIndex: 1,
  position: 'relative',
});

const OperatingPrinciples = () => {
  const [principles, setPrinciples] = useState<any[]>([]);
  const [signerCount, setSignerCount] = useState<number>(0);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIndex, setExpandedIndex] = useState<number | false>(false);

  const wallet = useActiveWallet()?.getAccount() as any;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchPrinciples(),
        fetchSignerCount(),
        wallet ? checkIfUserHasAccepted() : Promise.resolve(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [wallet]);

  const fetchPrinciples = async () => {
    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const result = await readContract({ contract, method: 'getAllPrinciples', params: [] });
      setPrinciples(result);
    } catch (error) {
      console.error('Error fetching principles:', error);
    }
  };

  const fetchSignerCount = async () => {
    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const count = await readContract({ contract, method: 'getSignerCount', params: [] });
      setSignerCount(Number(count));
    } catch (error) {
      console.error('Error fetching signer count:', error);
    }
  };

  const checkIfUserHasAccepted = async () => {
    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const accepted = await readContract({ contract, method: 'hasPrinciplesAccepted', params: [wallet.address] });
      setHasAccepted(accepted);
    } catch (error) {
      console.error('Error checking acceptance:', error);
    }
  };

  const handleAcceptPrinciples = async () => {
    if (!userName.trim()) {
      alert('Please enter your name before signing.');
      return;
    }
    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const transaction = await prepareContractCall({
        contract,
        method: 'acceptPrinciples',
        params: [userName.trim()],
        value: BigInt(0),
      });
      await sendAndConfirmTransaction({ transaction, account: wallet! });
      setHasAccepted(true);
      await fetchSignerCount();
    } catch (error) {
      console.error('Error accepting principles:', error);
    }
  };

  const handleAccordionChange = (index: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedIndex(isExpanded ? index : false);
  };

  if (loading) {
    return (
      <PageContainer>
        <ContentContainer>
          <PrinciplesCard>
            <StyledTypography variant="h6" textAlign="center">
              Initializing Zen Principles...
            </StyledTypography>
          </PrinciplesCard>
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer>
        <PrinciplesCard>
          <Title variant={isMobile ? 'h5' : 'h3'}>
            運営原則 - Operating Principles
          </Title>

          <SubTitle variant="subtitle1">
            署名者数: {signerCount}
          </SubTitle>

          {/* Scrollable Content Area */}
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, zIndex: 1, position: 'relative' }}>
            {/* Principles List */}
            <Box sx={{ mb: 4 }}>
              {principles.map((principle: any, index: number) => (
                <StyledAccordion
                  key={index}
                  expanded={expandedIndex === index}
                  onChange={handleAccordionChange(index)}
                  sx={{
                    boxShadow: expandedIndex === index
                      ? `0 0 20px ${synthwavePalette.neonPink}`
                      : '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <StyledTypography variant="h6">
                      {principle.japaneseName} - {principle.englishName}
                    </StyledTypography>
                  </StyledAccordionSummary>
                  <StyledAccordionDetails>
                    <StyledTypography variant="body1">
                      {principle.description}
                    </StyledTypography>
                  </StyledAccordionDetails>
                </StyledAccordion>
              ))}
            </Box>

            {/* Signing Section */}
            <SigningSection>
              {!hasAccepted ? (
                <>
                  <StyledTypography variant={isMobile ? 'h6' : 'h4'}>
                    禅の誓い - The Oath of Zen
                  </StyledTypography>

                  <StyledTypography variant="body1">
                    By signing, you commit to embodying and upholding our company's operating principles.
                    Your dedication ensures excellence, integrity, and a harmonious environment.
                  </StyledTypography>

                  <StyledTypography variant="body2" sx={{ mt: 1 }}>
                    Please enter your name below to signify your acceptance and commitment.
                  </StyledTypography>

                  <CustomInput
                    type="text"
                    placeholder="あなたの名前 - Your Name"
                    value={userName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
                  />

                  <StyledButton onClick={handleAcceptPrinciples}>
                    署名 - Sign
                  </StyledButton>
                </>
              ) : (
                <>
                  <StyledTypography variant={isMobile ? 'h6' : 'h4'} sx={{ color: synthwavePalette.softTeal }}>
                    ありがとう - Thank You
                  </StyledTypography>

                  <StyledTypography variant="body1">
                    運営原則へのあなたのコミットメントは、当社の基盤を強化し、卓越性と誠実さの文化を育みます。
                  </StyledTypography>
                </>
              )}
            </SigningSection>
          </Box>
        </PrinciplesCard>
      </ContentContainer>
    </PageContainer>
  );
};

export default OperatingPrinciples;