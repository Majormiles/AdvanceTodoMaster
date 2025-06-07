import React, { useState, useEffect } from 'react';
import { Box, Image, Text, Heading, VStack } from '@chakra-ui/react';

interface CarouselProps {
  images: string[];
  height?: string;
}

const carouselTexts = [
  {
    title: "Task Management Made Simple",
    description: "Organize, track, and complete your tasks efficiently"
  },
  {
    title: "Smart Task Organization",
    description: "Categorize and prioritize your work seamlessly"
  },
  {
    title: "Real-time Collaboration",
    description: "Share and manage tasks with your team instantly"
  },
  {
    title: "Progress Tracking",
    description: "Monitor your productivity with intuitive analytics"
  },
  {
    title: "Stay On Schedule",
    description: "Never miss a deadline with smart reminders"
  }
];

const Carousel: React.FC<CarouselProps> = ({
  images,
  height = "110px"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <Box position="relative" width="100%" overflow="hidden" height={height}>
      {images.map((image, index) => (
        <Box
          key={index}
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          opacity={index === currentIndex ? 1 : 0}
          transition="opacity 0.3s ease-in-out"
        >
          <Image
            src={image}
            alt={`Banner ${index + 1}`}
            objectFit="cover"
            width="100%"
            height="100%"
          />
          {/* Text Overlay */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="blackAlpha.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            padding="4"
          >
            <VStack spacing={0} textAlign="center" color="white">
              <Heading 
                size="lg" 
                mb={2}
                textShadow="1px 1px 1px rgba(0,0,0,0.8)"
                fontSize={{ base: "2xl", md: "3xl" }}
                fontWeight="bold"
                letterSpacing="wide"
              >
                {carouselTexts[index]?.title}
              </Heading>
              <Text
                fontSize={{ base: "xs", md: "sm" }}
                textShadow="1px 1px 1px rgba(0,0,0,0.8)"
                px={{ base: 2, md: 4 }}
              >
                {carouselTexts[index]?.description}
              </Text>
            </VStack>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Carousel; 