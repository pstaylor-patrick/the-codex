# Use Node.js 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port the app will run on
EXPOSE 3000

# Use ARG to accept a build-time argument for the database URL
ARG DATABASE_URL

# Use ENV to set the environment variable inside the container
ENV DATABASE_URL=$DATABASE_URL

# Build the Next.js app
RUN npm run build

# Start the Next.js app
CMD ["npm", "start"]
