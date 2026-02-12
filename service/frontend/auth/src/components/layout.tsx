import { theme } from '@metorial-io/ui';
import React from 'react';
import { styled } from 'styled-components';
// import astronaut from './astronaut_waving1.webp';

let Footer = styled('footer')`
  margin: 20px;

  p {
    font-size: 12px;
    color: ${theme.colors.gray600};
    /* text-shadow: 0 0 4px rgba(0, 0, 0, 0.2); */
    font-weight: 600;

    a {
      color: inherit;
      text-decoration: underline;
    }
  }

  @media (min-width: 800px) {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 600px;
    display: flex;
    justify-content: center;
    text-wrap: balance;
    text-align: center;
  }
`;

let Wrapper = styled.div`
  background: #dcc425;

  /* background:
    linear-gradient(135deg, #0099ff 25%, transparent 25%) -80px 0/ 160px 160px,
    linear-gradient(225deg, #dcc425 25%, transparent 25%) -80px 0/ 160px 160px,
    linear-gradient(315deg, #0099ff 25%, transparent 25%) 0px 0/ 160px 160px,
    linear-gradient(45deg, #dcc425 25%, #f9f1bd 25%) 0px 0/ 160px 160px; */

  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

let Box = styled.div`
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
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
    border-radius: 10px;
    max-height: 70dvh;
    max-width: calc(100dvw - 40px);
    width: 600px;
    height: 700px;
  }

  @media (min-width: 800px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 600px;
    max-width: 70dvw;
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

          <Side style={{ background: 'rgba(255, 255, 255, 1)' }} className="padded">
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
