import React from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <Box textAlign="center" py={10} px={6}>
      <VStack spacing={6}>
        <Heading
          display="inline-block"
          as="h1"
          size="4xl"
          bgGradient="linear(to-r, blue.400, blue.600)"
          backgroundClip="text"
        >
          404
        </Heading>
        
        <Text fontSize="lg" mt={3} mb={2}>
          Page Not Found
        </Text>
        
        <Text color={'gray.500'} mb={6}>
          The page you're looking for does not seem to exist
        </Text>
        
        <Button
          colorScheme="blue"
          bgGradient="linear(to-r, blue.400, blue.500, blue.600)"
          color="white"
          as={RouterLink}
          to="/"
        >
          Go to Home
        </Button>
      </VStack>
    </Box>
  );
};

export default NotFound; 