#!/bin/bash

npm install && npm run build && npm run deploy

while ! npm run start
do
	echo "Node crashed; restarting..."
	sleep 1
done

echo "Node exited normally"
