'use client';
import React, { useEffect, useState } from 'react';
import { Box, Text, Flex, Icon } from '@chakra-ui/react';
import { FaCog } from 'react-icons/fa';
import GravePageAssets from '@/components/GravePageAssets';
import ShareButton from '@/components/ShareButton';
import { formatAddress } from '@/utils/tokenUtils';
import Link from 'next/link';
import { useConnectedAccount } from '@/contexts/ConnectedAccountProvider';
import GraveAssistantConfigure from './GraveAssistantConfigure';

/** 
 * A: if user is signed in and this is not their page or if user is not signed in 
 *    we attempt to show the grave contents for this account
 *    1) check if account is valid UP and fetch metadata
 *         if NOT up display error message
 *    2) check if account has a grave vault and display contents
 *         if NOT display that this account does not yet have a GRAVE (+ give viewer option to SPAM this account :D)
 * B: if user is signed in and this is their page
 *    1) check if user has UAP set up
 *         if NOT display setup component
 *    2) check if account has a grave vault and display contents if yes (special view of content panels in edit mode)
**/
export default function GraveClient({ graveOwner }: { graveOwner: string }) {
  // const [steps, setSteps] = React.useState([...initialSteps]);
  /// useState<TokenData[]>([]);
  const { appNetworkConfig, universalProfile, isConnected } = useConnectedAccount();
  const [isOwnerConnected, setIsOwnerConnected] = useState(false);
  const [graveVault, setGraveVault] = useState<string | null>(null);
  useEffect(() => {
    if (universalProfile?.address.toLowerCase() === graveOwner.toLowerCase()) {
      setIsOwnerConnected(true);
      setGraveVault(universalProfile.protocolConfig?.graveVaultAddress ? universalProfile.protocolConfig?.graveVaultAddress : null);
    } else {
      setIsOwnerConnected(false);
      // fetch grave vault for this account
    }
  }, [universalProfile]);

  let graveTitle = 'YOUR GRAVEYARD';
  if (universalProfile?.address === graveOwner) {
    graveTitle = 'YOUR GRAVEYARD';
  } else {
    graveTitle = `${formatAddress(graveOwner)}'s GRAVEYARD`;
  }

  const configComponent = isConnected && isOwnerConnected ? <GraveAssistantConfigure /> : null;
  return (
    <Box>
      {configComponent}
      <Flex alignItems={'center'} gap={2}>
        <Text
          fontSize="20px"
          color="white"
          fontFamily="Bungee"
          mb="30px"
          mt="30px"
        >
          {graveTitle}
        </Text>
        {universalProfile?.address === graveOwner && (
          <Link href={`/${appNetworkConfig.chainSlug}/grave/configuration`} passHref>
            <Icon as={FaCog} color={'light.white'} h={5} w={6} />
          </Link>
        )}
        <ShareButton pageAccount={graveOwner} />
      </Flex>
      {/*<GravePageAssets graveOwner={graveOwner} />*/}
    </Box>
  );
}
