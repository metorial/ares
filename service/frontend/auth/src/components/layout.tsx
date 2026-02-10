import { theme } from '@metorial-io/ui';
import React from 'react';
import { styled } from 'styled-components';
// import astronaut from './astronaut_waving1.webp';
import bg from './bg.webp';

let Footer = styled('footer')`
  margin: 20px;

  p {
    font-size: 12px;
    color: ${theme.colors.gray200};
    text-shadow: 0 0 4px rgba(0, 0, 0, 1);
    font-weight: 600;

    a {
      color: inherit;
      text-decoration: underline;
    }
  }
`;

let Wrapper = styled.div`
  /* background-color: hsla(321, 100%, 98%, 1);
  background-image:
    radial-gradient(at 37% 72%, hsla(26, 60%, 66%, 1) 0px, transparent 50%),
    radial-gradient(at 82% 63%, hsla(193, 100%, 83%, 1) 0px, transparent 50%),
    radial-gradient(at 9% 14%, hsla(304, 38%, 68%, 1) 0px, transparent 50%);
  background-size: cover;
  background-position: center; */
  background-image: url(${bg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

let Box = styled.div`
  max-width: 70dvw;
  max-height: 70dvh;
  width: 600px;
  height: 700px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(15px);
  overflow: auto;
  /* padding: 50px; */
  display: flex;
  flex-direction: column;

  @media (max-width: 800px) {
    width: 90%;
    height: 90%;
    max-width: unset;
    max-height: unset;
    padding: 20px;
  }

  @media (max-width: 1000px) {
    background: white;

    .aside,
    hr {
      display: none;
    }
  }
`;

let Inner = styled.div`
  display: flex;
  min-height: 100%;
`;

let Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;

  @media (max-width: 1000px) {
    grid-template-columns: 100%;
  }
`;

let Side = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;

  &.padded {
    padding: 50px;

    @media (max-width: 800px) {
      padding: 20px;
    }
  }
`;

export let AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Wrapper>
      <Box>
        <Inner>
          {/* <Grid> */}
          {/* <Side className="aside padded" style={{ alignItems: 'center' }}>
              <img src={bubbles} style={{ width: '100%', maxWidth: 350 }} />
            </Side> */}

          <Side style={{ background: 'rgba(255, 255, 255, 0.9)' }} className="padded">
            {/* <Title as="h1" size="5" weight="bold">
                {main.title}
              </Title>
              <Spacer size={5} />
              <Text size="3" color="gray700" weight="medium">
                {main.description}
              </Text>
              <Spacer size={25} /> */}

            {children}
          </Side>
          {/* </Grid> */}
        </Inner>
      </Box>

      <Footer>
        <p>
          By signing up for, logging in to and/or using a{' '}
          <a href="https://metorial.com">Metorial</a> service, you agree to Metorial's{' '}
          <a href="https://metorial.com/legal/terms-of-service">terms of service</a> and{' '}
          <a href="https://metorial.com/legal/privacy-policy">privacy policy</a>.
        </p>
      </Footer>
    </Wrapper>
  );
};
