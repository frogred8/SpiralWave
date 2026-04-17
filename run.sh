docker rm -f spiralwave
docker run -d --name spiralwave -p 3300:3000 -p 3001:3001 spiralwave
