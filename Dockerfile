# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Install git
RUN apt-get update && apt-get install -y git

# Set the working directory in the container
WORKDIR /app

# Copy the rest of your app's source code
COPY . .

# Copy the entrypoint script and make it executable
RUN chmod +x /app/docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# The command to run when the container starts (will be passed to the entrypoint)
CMD ["npm", "run", "prod"]
