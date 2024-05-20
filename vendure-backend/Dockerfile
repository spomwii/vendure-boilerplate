# Use the official Node.js image from the Docker Hub
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and yarn.lock files to the working directory
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn install --production

# Install concurrently globally using Yarn
RUN yarn global add concurrently

# Copy the rest of the application code to the working directory
COPY . .

# Build the application
RUN yarn build

# Define the command to run the application
CMD ["sh", "-c", "yarn seed:once && yarn start"]