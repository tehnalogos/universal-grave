'use client';

import React, { useState } from 'react';
import { Box, Button, Flex, Spinner, Text, VStack } from '@chakra-ui/react';
//import AssistantInfo from '@/components/AssistantInfo';
import URDSetup from '@/components/URDSetup';
import SignInBox from '@/components/SignInBox';
import { useConnectedAccount } from '@/contexts/ConnectedAccountProvider';
//import SetupAssistant from '@/components/SetupAssistant';
//import Breadcrumbs from '@/components/Breadcrumbs';


export default function GraveAssistantConfigure() {
  const { appNetworkConfig: network, universalProfile, isConnected, switchNetwork } = useConnectedAccount();
  /*
  const assistantInfo =
    network.assistants[assistantAddress.toLowerCase()] || null;
    */

  const [error, setError] = useState<string | null>(null);

  const address = universalProfile?.address;

  const renderConfigureBody = () => {
    if (!isConnected || !address) {
      return <SignInBox />;
    }

    if (universalProfile && universalProfile.profileNetworkConfig.chainId !== network.chainId) {
      return (
        <Flex
          height="100%"
          w="100%"
          alignContent="center"
          justifyContent="center"
          pt={4}
        >
          <VStack>
            <Text>You’re connected to {universalProfile.profileNetworkConfig.name}.</Text>
            <Text>
              Please change network to {network.name}
            </Text>
            <Button onClick={() => switchNetwork(network.chainId)}>
              Change network
            </Button>
          </VStack>
        </Flex>
      );
    }

    /*
    if (isLoading) {
      return <Spinner size={'xl'} alignSelf={'center'} />;
    }
      */

    if (error) {
      return <Text color="red.500">{error}</Text>;
    }

    if (
      !universalProfile.mainUPController ||
      !universalProfile.protocolConfig?.hasCorrectPermissions ||
      !universalProfile.protocolConfig?.isUAPInstalled
    ) {
      console.log("we need to set up the URD!", universalProfile);
      return (
        <URDSetup />
      );
    }

    return "";
    //return <SetupAssistant config={assistantInfo} />;
  };

  return (
    <Box pt={4} pb={4} w="100%">
      <Flex direction="column" gap={4} mt={4} w="100%">
        <Flex w="100%">
          {/*<AssistantInfo assistant={assistantInfo} />*/}
        </Flex>
        <Box border="1px" borderColor="gray.200" w="100%" />
        {renderConfigureBody()}
      </Flex>
    </Box>
  );
}

