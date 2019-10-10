FROM node:10
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install
ADD . /app
ENV NODE_ENV production
ARG IS_TESTNET
ENV IS_TESTNET ${IS_TESTNET}
RUN npm run build
ENV HOST 0.0.0.0
EXPOSE 3000
USER 1337
CMD npm start
