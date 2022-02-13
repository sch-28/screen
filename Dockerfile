FROM node:lts-alpine AS ui-build
WORKDIR /usr/src/app
COPY Client/ ./Client/
RUN cd Client && npm install && npm run build

FROM node:lts-alpine AS server-build
WORKDIR /root/
COPY --from=ui-build /usr/src/app/Client/dist ./Client/dist
COPY Server/ ./Server/
RUN cd Server && npm install   
EXPOSE 3000
WORKDIR /root/Server
CMD ["node", "./bin/www"]
